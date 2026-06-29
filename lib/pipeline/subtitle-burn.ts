import fs from 'fs';
import path from 'path';
import { ffmpeg } from '../ffmpeg';
import type { Segment } from './types';

function toAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.round((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function escapeAss(text: string): string {
  // ASS doesn't support real newlines in dialogue — replace with \N
  return text.replace(/\n/g, '\\N').replace(/\r/g, '');
}

export async function generateAssFile(segments: Segment[], jobDir: string): Promise<string> {
  const assPath = path.join(jobDir, 'subtitles.ass');

  const header = `[Script Info]
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,52,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,1,2,10,10,30,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const dialogues = segments
    .filter(s => s.translatedText)
    .map(s => {
      const start = toAssTime(s.startTime);
      const end   = toAssTime(s.endTime);
      const text  = escapeAss(s.translatedText!);
      return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
    })
    .join('\n');

  fs.writeFileSync(assPath, header + dialogues + '\n');
  return assPath;
}

export async function burnSubtitles(
  videoPath: string,
  assPath: string,
  jobDir: string
): Promise<string> {
  const outputPath = path.join(jobDir, 'output.mp4');

  await ffmpeg([
    '-i', videoPath,
    '-vf', `ass=${assPath}`,
    '-c:a', 'copy',
    outputPath,
  ]);

  return outputPath;
}
