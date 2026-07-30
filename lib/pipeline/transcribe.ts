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

interface AlignedSegment {
  start: number;
  end: number;
  text: string;
  words: GroqWord[];
}

// Same overlap problem as clipOverlaps below, but between consecutive words —
// clip it here first so every downstream boundary (segments and the
// pause-based subtitle pieces built from words) inherits monotonic timing.
function clipWordOverlaps(words: GroqWord[]): void {
  for (let i = 1; i < words.length; i++) {
    if (words[i].start < words[i - 1].end) {
      const midpoint = (words[i - 1].end + words[i].start) / 2;
      words[i - 1].end = midpoint;
      words[i].start = midpoint;
    }
  }
}

// Whisper's segment-level start/end can degrade into a naive uniform guess for
// short punchy phrases over music/sound design (common in brand/marketing
// videos), producing back-to-back segments with suspiciously round durations
// and no gaps even where real pauses exist. Word-level timestamps come from
// per-token alignment and don't have this failure mode, so we re-derive each
// segment's real boundaries from its first and last word, and keep the
// per-word spans so downstream subtitle chunking can find real pauses too.
function realignWithWords(segments: GroqSegment[], words: GroqWord[]): AlignedSegment[] {
  let wi = 0;
  const aligned: AlignedSegment[] = [];
  for (const seg of segments) {
    const wordCount = seg.text.trim().split(/\s+/).filter(Boolean).length;
    const chunk = words.slice(wi, wi + wordCount);
    if (chunk.length !== wordCount) {
      // Word/segment tokenization mismatch — keep the original segment timing.
      aligned.push({ start: seg.start, end: seg.end, text: seg.text, words: [] });
      continue;
    }
    aligned.push({ start: chunk[0].start, end: chunk[chunk.length - 1].end, text: seg.text, words: chunk });
    wi += wordCount;
  }
  return aligned;
}

// Whisper's word-level alignment isn't always strictly monotonic across a
// segment boundary — the end of one segment's last word can land after the
// start of the next segment's first word (observed overlaps up to ~0.5s).
// Left alone this produces subtitles that jump backward in time. Clip each
// overlap at its midpoint so segments stay sequential.
function clipOverlaps(segments: AlignedSegment[]): void {
  for (let i = 1; i < segments.length; i++) {
    const prev = segments[i - 1];
    const curr = segments[i];
    if (curr.start < prev.end) {
      const midpoint = (prev.end + curr.start) / 2;
      prev.end = midpoint;
      curr.start = midpoint;
      if (prev.words.length) prev.words[prev.words.length - 1].end = midpoint;
      if (curr.words.length) curr.words[0].start = midpoint;
    }
  }
}

// No genuine spoken word takes less than this long to say. Whisper
// occasionally hallucinates a short word over background music or ambient
// noise after real speech has ended (common in a video's musical outro) —
// a segment this brief is that artifact, not real dialogue.
const MIN_SEGMENT_SECONDS = 0.2;

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
  if (data.words?.length) clipWordOverlaps(data.words);

  const rawSegments: AlignedSegment[] = data.words?.length
    ? realignWithWords(data.segments ?? [], data.words)
    : (data.segments ?? []).map((seg) => ({ start: seg.start, end: seg.end, text: seg.text, words: [] }));

  clipOverlaps(rawSegments);

  const filtered = rawSegments.filter((seg) => seg.end - seg.start >= MIN_SEGMENT_SECONDS);

  return filtered.map((seg, i) => ({
    id: i,
    startTime: seg.start,
    endTime: seg.end,
    originalText: seg.text.trim(),
    targetDuration: seg.end - seg.start,
    words: seg.words.length ? seg.words.map((w) => ({ start: w.start, end: w.end, text: w.word })) : undefined,
  }));
}
