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

// Whisper's word-level alignment isn't always strictly monotonic — the end
// of one word can land after the start of the next (observed overlaps up to
// ~0.5s). Left alone this produces subtitles that jump backward in time.
// Clip each overlap at its midpoint so words stay sequential.
function clipWordOverlaps(words: GroqWord[]): void {
  for (let i = 1; i < words.length; i++) {
    if (words[i].start < words[i - 1].end) {
      const midpoint = (words[i - 1].end + words[i].start) / 2;
      words[i - 1].end = midpoint;
      words[i].start = midpoint;
    }
  }
}

// Whisper folding a trailing pause into a word's own duration (see
// splitSegmentsAtPauses) is normally a fraction of a second. Near the end of
// a clip it can run away much further — a whole musical outro absorbed into
// the last word, reported as many seconds long. No single word legitimately
// takes that long to say, so cap how much of a word's own span we trust.
const MAX_WORD_SECONDS = 2;

function capWordDurations(words: GroqWord[]): void {
  for (const w of words) {
    if (w.end - w.start > MAX_WORD_SECONDS) w.end = w.start + MAX_WORD_SECONDS;
  }
}

export async function transcribe(audioPath: string): Promise<Segment[]> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');

  const audioBuffer = fs.readFileSync(audioPath);
  const audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' });

  const form = new FormData();
  form.append('file', audioBlob, 'audio.mp3');
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

  // Whisper's own segment-level text grouping isn't reliable — it will
  // sometimes split a phrase mid-clause with zero gap (e.g. "Okta
  // Integration" | "Network...", or "Where are my" | "agents?"), which has
  // nothing to do with real speech structure. Word-level timestamps are the
  // one reliable signal, so the whole transcript is treated as a single
  // stream of words; real phrase boundaries are decided downstream purely
  // from pause detection over that stream (see splitSegmentsAtPauses), not
  // from wherever Whisper happened to break its own segments.
  if (data.words?.length) {
    clipWordOverlaps(data.words);
    capWordDurations(data.words);
    const words = data.words;
    return [{
      id: 0,
      startTime: words[0].start,
      endTime: words[words.length - 1].end,
      originalText: words.map((w) => w.word).join(' ').trim(),
      targetDuration: words[words.length - 1].end - words[0].start,
      words: words.map((w) => ({ start: w.start, end: w.end, text: w.word })),
    }];
  }

  // Fallback for the rare case where word-level timestamps aren't returned.
  return (data.segments ?? []).map((seg, i) => ({
    id: i,
    startTime: seg.start,
    endTime: seg.end,
    originalText: seg.text.trim(),
    targetDuration: seg.end - seg.start,
  }));
}
