import fs from 'fs';
import path from 'path';
import type { Segment } from './types';

const MAX_CHARS_PER_LINE = 42;
const MAX_LINES = 2;

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
    const chunks = splitIntoChunks(s.translatedText!);
    const duration = s.endTime - s.startTime;
    const chunkDuration = duration / chunks.length;

    chunks.forEach((chunk, i) => {
      const start = s.startTime + i * chunkDuration;
      const end   = s.startTime + (i + 1) * chunkDuration;
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
