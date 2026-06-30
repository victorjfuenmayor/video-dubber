import fs from 'fs';
import path from 'path';
import type { Segment } from './types';

const MAX_CHARS_PER_LINE = 42;
const MAX_LINES = 2;

function wrapSubtitle(text: string): string {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (lines.length >= MAX_LINES) break; // hard cap at 2 lines
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= MAX_CHARS_PER_LINE) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word.length > MAX_CHARS_PER_LINE ? word.slice(0, MAX_CHARS_PER_LINE) : word;
    }
  }
  if (current && lines.length < MAX_LINES) lines.push(current);
  return lines.join('\n');
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

  const lines = segments
    .filter(s => s.translatedText)
    .map((s, idx) => [
      String(idx + 1),
      `${toSrtTime(s.startTime)} --> ${toSrtTime(s.endTime)}`,
      wrapSubtitle(s.translatedText!),
      '',
    ].join('\n'));

  fs.writeFileSync(srtPath, lines.join('\n'));
  return srtPath;
}
