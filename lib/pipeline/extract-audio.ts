import path from 'path';
import { ffmpeg } from '../ffmpeg';

export async function extractAudio(videoPath: string, jobDir: string): Promise<string> {
  const outPath = path.join(jobDir, 'audio.wav');
  await ffmpeg([
    '-i', videoPath,
    '-vn',
    '-acodec', 'pcm_s16le',
    '-ar', '16000',
    '-ac', '1',
    outPath,
  ]);
  return outPath;
}
