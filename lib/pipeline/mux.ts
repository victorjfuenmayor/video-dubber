import fs from 'fs';
import path from 'path';
import { ffmpeg, getAudioDuration } from '../ffmpeg';
import type { Segment } from './types';

export async function muxDubbedVideo(
  videoPath: string,
  segments: Segment[],
  jobDir: string
): Promise<string> {
  const videoDuration = await getAudioDuration(videoPath);
  const dubbedAudioPath = path.join(jobDir, 'dubbed_audio.wav');
  const outputPath = path.join(jobDir, 'output.mp4');

  await buildDubbedAudioTrack(segments, dubbedAudioPath, videoDuration, jobDir);

  await ffmpeg([
    '-i', videoPath,
    '-i', dubbedAudioPath,
    '-map', '0:v',
    '-map', '1:a',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-shortest',
    outputPath,
  ]);

  return outputPath;
}

async function makeSilence(filePath: string, duration: number): Promise<void> {
  await ffmpeg([
    '-f', 'lavfi',
    '-i', 'anullsrc=r=16000:cl=mono',
    '-t', duration.toFixed(6),
    filePath,
  ]);
}

// Strict concat approach: silence_gap + segment + silence_gap + segment ...
// This makes overlap physically impossible — each piece is placed sequentially.
async function buildDubbedAudioTrack(
  segments: Segment[],
  outputPath: string,
  totalDuration: number,
  jobDir: string
): Promise<void> {
  const validSegments = segments.filter((s) => s.audioFile);

  if (validSegments.length === 0) {
    await makeSilence(outputPath, totalDuration);
    return;
  }

  const pieces: string[] = [];
  let cursor = 0;

  for (let i = 0; i < validSegments.length; i++) {
    const seg = validSegments[i];

    // Always anchor to the original startTime; clamp to cursor if a previous
    // segment overflowed and we can't go backwards in the linear track.
    const actualStart = Math.max(cursor, seg.startTime);

    const gap = actualStart - cursor;
    if (gap > 0.005) {
      const silPath = path.join(jobDir, `gap_${i}.wav`);
      await makeSilence(silPath, gap);
      pieces.push(silPath);
    }

    const segDuration = await getAudioDuration(seg.audioFile!);
    const availableTime = totalDuration - actualStart;

    if (availableTime <= 0.005) {
      // Segment starts at or past video end — skip it
      cursor = actualStart;
    } else if (segDuration > availableTime + 0.005) {
      // Segment overflows video end — speed it up to fit
      const trimmedPath = path.join(jobDir, `seg_fit_${i}.wav`);
      const factor = Math.max(0.5, segDuration / availableTime);
      const atempo = factor <= 2.0
        ? `atempo=${factor.toFixed(4)}`
        : `atempo=${Math.sqrt(factor).toFixed(4)},atempo=${Math.sqrt(factor).toFixed(4)}`;
      await ffmpeg(['-i', seg.audioFile!, '-filter:a', atempo, trimmedPath]);
      pieces.push(trimmedPath);
      cursor = totalDuration;
    } else {
      pieces.push(seg.audioFile!);
      cursor = actualStart + segDuration;
    }
  }

  // Silence to fill remaining video duration
  const tail = totalDuration - cursor;
  if (tail > 0.005) {
    const tailPath = path.join(jobDir, 'gap_tail.wav');
    await makeSilence(tailPath, tail);
    pieces.push(tailPath);
  }

  // Write concat list and stitch
  const listPath = path.join(jobDir, 'concat.txt');
  fs.writeFileSync(listPath, pieces.map((f) => `file '${f}'`).join('\n'));

  await ffmpeg([
    '-f', 'concat',
    '-safe', '0',
    '-i', listPath,
    '-c:a', 'pcm_s16le',
    outputPath,
  ]);
}
