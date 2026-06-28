import fs from 'fs';
import { spawn } from 'child_process';
import type { Segment } from './types';

const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';

// Detect when speech actually starts in the audio file using ffmpeg silencedetect.
// Whisper (via Groq) strips leading silence and reports timestamps from t=0,
// so we need to measure the real onset and shift all segment timestamps.
function detectSpeechOnset(audioPath: string): Promise<number> {
  return new Promise((resolve) => {
    const proc = spawn(FFMPEG, [
      '-i', audioPath,
      '-af', 'silencedetect=n=-40dB:d=0.3',
      '-f', 'null', '-',
    ], { stdio: ['ignore', 'ignore', 'pipe'] });

    let stderr = '';
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', () => {
      // silence_end is when the first period of silence ends = speech starts
      const match = stderr.match(/silence_end: ([\d.]+)/);
      resolve(match ? parseFloat(match[1]) : 0);
    });
    proc.on('error', () => resolve(0));
  });
}

interface GroqSegment {
  text: string;
  start: number;
  end: number;
}

interface GroqResponse {
  segments: GroqSegment[];
}

export async function transcribe(audioPath: string): Promise<Segment[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const audioBuffer = fs.readFileSync(audioPath);
  const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });

  const form = new FormData();
  form.append('file', audioBlob, 'audio.wav');
  form.append('model', 'whisper-large-v3');
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'segment');
  form.append('language', 'en');

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq transcription failed (${res.status}): ${text}`);
  }

  const data: GroqResponse = await res.json();
  const rawSegments = data.segments ?? [];

  // Merge very short segments (<1.5s) into adjacent ones for better translation quality
  const merged: GroqSegment[] = [];
  for (const seg of rawSegments) {
    if ((seg.end - seg.start) < 1.5 && merged.length > 0) {
      const last = merged[merged.length - 1];
      last.text += ' ' + seg.text.trim();
      last.end = seg.end;
    } else {
      merged.push({ ...seg });
    }
  }

  const rawResult = merged.map((seg, i) => ({
    id: i,
    startTime: seg.start,
    endTime: seg.end,
    originalText: seg.text.trim(),
    targetDuration: seg.end - seg.start,
  }));

  if (rawResult.length === 0) return rawResult;

  // Calculate how much Whisper shifted timestamps by comparing
  // its first segment start against when speech actually begins in the file.
  const speechOnset = await detectSpeechOnset(audioPath);
  const whisperOffset = speechOnset - rawResult[0].startTime;

  // Only apply if the offset is meaningful (>0.5s) to avoid overcorrecting noise
  if (whisperOffset < 0.5) return rawResult;

  return rawResult.map((seg) => ({
    ...seg,
    startTime: seg.startTime + whisperOffset,
    endTime: seg.endTime + whisperOffset,
  }));
}
