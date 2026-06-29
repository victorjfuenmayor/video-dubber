import fs from 'fs';
import path from 'path';
import { EventEmitter } from 'events';
import { saveUploadedFile, downloadYouTube } from './download';
import { extractAudio } from './extract-audio';
import { transcribe } from './transcribe';
import { translateSegments } from './translate';
import { mergeSentenceSegments } from './merge-sentences';
import { generateTTS, DEFAULT_VOICE_ID } from './tts';
import { speedMatchSegments } from './timing';
import { muxDubbedVideo } from './mux';
import { getJob } from '@/lib/jobs';
import type { TargetLang } from '@/lib/voices';

export type ProgressEvent = {
  step: string;
  status: 'running' | 'done' | 'error';
  message: string;
};

export async function runPipeline(
  input: { type: 'upload'; data: ArrayBuffer } | { type: 'youtube'; url: string },
  jobId: string,
  events: EventEmitter,
  tmpBase: string,
  voiceId: string = DEFAULT_VOICE_ID,
  targetLang: TargetLang = 'es',
): Promise<string> {
  const jobDir = path.join(tmpBase, jobId);
  fs.mkdirSync(jobDir, { recursive: true });

  const langLabel = targetLang === 'pt-BR' ? 'Portuguese' : 'Spanish';
  const checkCancelled = () => { if (getJob(jobId)?.cancelled) throw new Error('Cancelled'); };

  const emit = (step: string, status: 'running' | 'done' | 'error', message: string) => {
    events.emit('progress', { step, status, message } satisfies ProgressEvent);
  };

  try {
    // Step 1: Acquire video
    emit('download', 'running', input.type === 'youtube' ? 'Downloading video...' : 'Saving uploaded file...');
    const videoPath =
      input.type === 'youtube'
        ? await downloadYouTube(input.url, jobDir)
        : await saveUploadedFile(input.data, jobDir);
    emit('download', 'done', 'Video ready');
    checkCancelled();

    // Step 2: Extract audio
    emit('extract_audio', 'running', 'Extracting audio...');
    const audioPath = await extractAudio(videoPath, jobDir);
    emit('extract_audio', 'done', 'Audio extracted');
    checkCancelled();

    // Step 3: Transcribe
    emit('transcribe', 'running', 'Transcribing audio with Whisper...');
    const segments = await transcribe(audioPath);
    emit('transcribe', 'done', `Found ${segments.length} segments`);
    checkCancelled();

    const sentenceSegments = mergeSentenceSegments(segments);

    emit('translate', 'running', `Translating ${sentenceSegments.length} sentences with timing calibration...`);
    const translated = await translateSegments(sentenceSegments, targetLang);
    emit('translate', 'done', 'Translation complete');
    checkCancelled();

    emit('tts', 'running', `Generating ${langLabel} audio for ${translated.length} sentences...`);
    const withAudio = await generateTTS(translated, jobDir, voiceId, targetLang);
    emit('tts', 'done', `${langLabel} audio generated`);
    checkCancelled();

    emit('timing', 'running', 'Adjusting audio timing...');
    const timed = await speedMatchSegments(withAudio, jobDir);
    emit('timing', 'done', 'Timing adjusted');
    checkCancelled();

    emit('mux', 'running', 'Assembling final video...');
    const outputPath = await muxDubbedVideo(videoPath, timed, jobDir);
    emit('mux', 'done', 'Video assembled');

    events.emit('complete', { outputPath });
    return outputPath;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    emit('error', 'error', message);
    events.emit('error', new Error(message));
    throw err;
  }
}
