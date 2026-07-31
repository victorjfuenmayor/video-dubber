import fs from 'fs';
import path from 'path';
import type { Segment } from './types';

const MAX_CHARS_PER_LINE = 42;
// Japanese has no spaces between words and much higher glyph density/width
// per character than Latin scripts, so broadcast-subtitle convention uses a
// much shorter line length.
const MAX_CHARS_PER_LINE_JA = 20;
const MAX_LINES = 2;

// Hiragana, Katakana, and CJK ideograph (kanji) Unicode ranges.
const CJK_PATTERN = /[぀-ヿ一-鿿]/;

// Split text into chunks of max MAX_LINES lines each, preserving all words.
// Japanese doesn't delimit words with spaces, so word-based wrapping would
// treat an entire sentence as one unbreakable unit — wrap by character
// count instead when the text is CJK.
function splitIntoChunks(text: string): string[] {
  if (CJK_PATTERN.test(text)) return splitIntoChunksByChar(text);

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

// Cutting every (MAX_CHARS_PER_LINE_JA * MAX_LINES) characters regardless of
// what's left over can strand a trailing sentence-ending particle and period
// (e.g. "です。") as its own chunk — displayed for a fraction of a second.
// If what remains after a cut would be this short, fold it into the current
// chunk instead of starting a new one for it.
const MIN_CHARS_PER_CHUNK_JA = 6;

function splitIntoChunksByChar(text: string): string[] {
  const chars = Array.from(text.trim());
  const maxCharsPerChunk = MAX_CHARS_PER_LINE_JA * MAX_LINES;
  const chunks: string[] = [];
  let start = 0;

  while (start < chars.length) {
    let end = Math.min(start + maxCharsPerChunk, chars.length);
    const remaining = chars.length - end;
    if (remaining > 0 && remaining < MIN_CHARS_PER_CHUNK_JA) end = chars.length;

    const slice = chars.slice(start, end);
    const lines: string[] = [];
    for (let i = 0; i < slice.length; i += MAX_CHARS_PER_LINE_JA) {
      if (lines.length === MAX_LINES - 1) {
        // Last allowed line — absorb everything remaining rather than
        // wrapping onto a 3rd line just because we folded a short tail in.
        lines.push(slice.slice(i).join(''));
        break;
      }
      lines.push(slice.slice(i, i + MAX_CHARS_PER_LINE_JA).join(''));
    }
    chunks.push(lines.join('\n'));
    start = end;
  }

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
    const chunks = splitIntoChunks(s.translatedText!);
    const duration = s.endTime - s.startTime;
    const chunkChars = chunks.map((c) => c.replace(/\n/g, ' ').length);
    const totalChars = chunkChars.reduce((sum, n) => sum + n, 0);

    let cursor = s.startTime;
    chunks.forEach((chunk, i) => {
      const share = totalChars > 0 ? chunkChars[i] / totalChars : 1 / chunks.length;
      const start = cursor;
      const end   = i === chunks.length - 1 ? s.endTime : start + duration * share;
      cursor = end;
      entries.push([
        String(counter++),
        `${toSrtTime(start)} --> ${toSrtTime(end)}`,
        chunk,
        '',
      ].join('\n'));
    });
  }

  fs.writeFileSync(srtPath, entries.join('\n'));
  return srtPath;
}
