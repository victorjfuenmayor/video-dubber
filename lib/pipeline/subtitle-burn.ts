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

function splitIntoChunksByChar(text: string): string[] {
  const chars = Array.from(text.trim());
  const chunks: string[] = [];
  let currentLines: string[] = [];

  for (let i = 0; i < chars.length; i += MAX_CHARS_PER_LINE_JA) {
    currentLines.push(chars.slice(i, i + MAX_CHARS_PER_LINE_JA).join(''));
    if (currentLines.length >= MAX_LINES) {
      chunks.push(currentLines.join('\n'));
      currentLines = [];
    }
  }
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
