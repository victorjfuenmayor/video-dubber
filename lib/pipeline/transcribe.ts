import fs from 'fs';
import type { Segment } from './types';

interface GroqSegment {
  text: string;
  start: number;
  end: number;
}

interface GroqWord {
  word: string;
  start: number;
  end: number;
}

interface GroqResponse {
  segments: GroqSegment[];
  words?: GroqWord[];
}

// Whisper's segment-level start/end can degrade into a naive uniform guess for
// short punchy phrases over music/sound design (common in brand/marketing
// videos), producing back-to-back segments with suspiciously round durations
// and no gaps even where real pauses exist. Word-level timestamps come from
// per-token alignment and don't have this failure mode, so we re-derive each
// segment's real boundaries from its first and last word.
function realignWithWords(segments: GroqSegment[], words: GroqWord[]): GroqSegment[] {
  let wi = 0;
  const aligned: GroqSegment[] = [];
  for (const seg of segments) {
    const wordCount = seg.text.trim().split(/\s+/).filter(Boolean).length;
    const chunk = words.slice(wi, wi + wordCount);
    if (chunk.length !== wordCount) {
      // Word/segment tokenization mismatch — keep the original segment timing.
      aligned.push(seg);
      continue;
    }
    aligned.push({ ...seg, start: chunk[0].start, end: chunk[chunk.length - 1].end });
    wi += wordCount;
  }
  return aligned;
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
  form.append('timestamp_granularities[]', 'word');
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
  const rawSegments = data.words?.length
    ? realignWithWords(data.segments ?? [], data.words)
    : data.segments ?? [];

  return rawSegments.map((seg, i) => ({
    id: i,
    startTime: seg.start,
    endTime: seg.end,
    originalText: seg.text.trim(),
    targetDuration: seg.end - seg.start,
  }));
}
