import path from 'path';
import { ffmpeg } from '../ffmpeg';

// Groq's transcription API caps requests at 25MB. Raw 16-bit PCM WAV runs
// ~256kbps (32KB/s), which caps video length at ~13 minutes before hitting
// that limit. Whisper doesn't need lossless audio, so encoding to mp3 at
// 64kbps (8KB/s) cuts file size ~8x, raising the ceiling to roughly 50 min.
export async function extractAudio(videoPath: string, jobDir: string): Promise<string> {
  const outPath = path.join(jobDir, 'audio.mp3');
  await ffmpeg([
    '-i', videoPath,
    '-vn',
    '-acodec', 'libmp3lame',
    '-b:a', '64k',
    '-ar', '16000',
    '-ac', '1',
    outPath,
  ]);
  return outPath;
}
