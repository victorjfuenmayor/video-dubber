import fs from 'fs';
import path from 'path';
import type { Segment } from './types';

const MAX_CHARS_PER_LINE = 42;
const MAX_LINES = 2;

// A gap this long between two words is a real speech pause, not just
// natural articulation spacing — a good place to split a subtitle.
const PAUSE_GAP_SECONDS = 0.35;

// Whisper often folds a trailing pause into the *previous* word's own
// duration instead of reporting a gap — especially after sentence-ending
// punctuation. A single word rarely legitimately takes this long to say, so
// treat it as a swallowed pause too.
const LONG_WORD_SECONDS = 0.9;

interface WordSpan { start: number; end: number; text: string; }
interface TimedPiece { text: string; start: number; end: number; }

// Splits translatedText into pieces whose *word-count* shares match `shares`,
// preserving word order. Every share gets at least one word except when the
// text runs out first.
function splitTextByShares(text: string, shares: number[]): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const totalShare = shares.reduce((a, b) => a + b, 0) || 1;
  const totalWords = words.length;
  const pieces: string[] = [];
  let wordIdx = 0;
  let cumulative = 0;
  for (let i = 0; i < shares.length; i++) {
    cumulative += shares[i];
    const isLast = i === shares.length - 1;
    let targetIdx = isLast ? totalWords : Math.round((cumulative / totalShare) * totalWords);
    targetIdx = Math.max(targetIdx, Math.min(wordIdx + 1, totalWords));
    targetIdx = Math.min(targetIdx, totalWords);
    pieces.push(words.slice(wordIdx, targetIdx).join(' '));
    wordIdx = targetIdx;
  }
  return pieces;
}

// A segment's own translated text can span multiple original phrases that
// Whisper bundled into one segment (e.g. "Okta. We secure identities. From
// the start." with no detected internal split). Word-level timestamps reveal
// real pauses within that span, so we cut the subtitle there instead of
// smearing the whole segment's duration evenly across its text.
function buildTimedPieces(text: string, startTime: number, endTime: number, words?: WordSpan[]): TimedPiece[] {
  if (!words || words.length < 2) return [{ text, start: startTime, end: endTime }];

  const boundaries: number[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    const gap = words[i + 1].start - words[i].end;
    const ownDuration = words[i].end - words[i].start;
    const endsSentence = /[.!?]$/.test(words[i].text.trim());
    if (gap > PAUSE_GAP_SECONDS || (endsSentence && ownDuration > LONG_WORD_SECONDS)) {
      boundaries.push(i);
    }
  }
  if (boundaries.length === 0) return [{ text, start: startTime, end: endTime }];

  const shares: number[] = [];
  let prev = 0;
  for (const b of boundaries) {
    shares.push(b + 1 - prev);
    prev = b + 1;
  }
  shares.push(words.length - prev);

  const texts = splitTextByShares(text, shares);
  const pieces: TimedPiece[] = [];
  let wordStart = 0;
  for (let i = 0; i < shares.length; i++) {
    const wordEnd = wordStart + shares[i] - 1;
    const start = i === 0 ? startTime : words[wordStart].start;
    const end = i === shares.length - 1 ? endTime : words[wordEnd].end;
    pieces.push({ text: texts[i], start, end });
    wordStart = wordEnd + 1;
  }
  return pieces;
}

// Split text into chunks of max MAX_LINES lines each, preserving all words
function splitIntoChunks(text: string): string[] {
  const words = text.trim().split(/\s+/);
  const chunks: string[] = [];
  let currentLines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= MAX_CHARS_PER_LINE) {
      currentLine = candidate;
    } else {
      if (currentLine) currentLines.push(currentLine);
      currentLine = word;
      if (currentLines.length >= MAX_LINES) {
        chunks.push(currentLines.join('\n'));
        currentLines = [];
      }
    }
  }
  if (currentLine) currentLines.push(currentLine);
  if (currentLines.length > 0) chunks.push(currentLines.join('\n'));
  return chunks.length > 0 ? chunks : [text];
}

function toSrtTime(seconds: number): string {
  const h  = Math.floor(seconds / 3600);
  const m  = Math.floor((seconds % 3600) / 60);
  const s  = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

export async function generateSrtFile(segments: Segment[], jobDir: string): Promise<string> {
  const srtPath = path.join(jobDir, 'subtitles.srt');

  const entries: string[] = [];
  let counter = 1;

  for (const s of segments.filter(s => s.translatedText)) {
    const pieces = buildTimedPieces(s.translatedText!, s.startTime, s.endTime, s.words);

    for (const piece of pieces) {
      const chunks = splitIntoChunks(piece.text);
      const duration = piece.end - piece.start;
      const chunkChars = chunks.map((c) => c.replace(/\n/g, ' ').length);
      const totalChars = chunkChars.reduce((sum, n) => sum + n, 0);

      let cursor = piece.start;
      chunks.forEach((chunk, i) => {
        const share = totalChars > 0 ? chunkChars[i] / totalChars : 1 / chunks.length;
        const start = cursor;
        const end   = i === chunks.length - 1 ? piece.end : start + duration * share;
        cursor = end;
        entries.push([
          String(counter++),
          `${toSrtTime(start)} --> ${toSrtTime(end)}`,
          chunk,
          '',
        ].join('\n'));
      });
    }
  }

  fs.writeFileSync(srtPath, entries.join('\n'));
  return srtPath;
}
