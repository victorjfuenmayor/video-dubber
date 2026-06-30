import fs from 'fs';
import path from 'path';
import type { Segment } from './types';

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
      s.translatedText!.trim(),
      '',
    ].join('\n'));

  fs.writeFileSync(srtPath, lines.join('\n'));
  return srtPath;
}
