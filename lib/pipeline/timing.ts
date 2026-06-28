import path from 'path';
import { ffmpeg, getAudioDuration } from '../ffmpeg';
import type { Segment } from './types';

const MAX_PER_SEGMENT = 1.20;

/*
 * Speed-up priority — every segment starts at its original startTime:
 *
 * 1. Fits in window       → no change
 * 2. Overflow ≤ 1.20x     → speed up that segment by exact ratio (fits exactly)
 * 3. Overflow > 1.20x     → cap at 1.20x (may still overflow into next gap)
 * 4. Even 1.20x not enough → apply global factor (min to fit the worst offender)
 *
 * Placement (mux.ts): always anchor to startTime. Only exception: if a previous
 * segment's overflow pushes cursor past the next startTime, that segment starts
 * immediately after (can't go backwards in a linear audio track).
 */
export async function speedMatchSegments(segments: Segment[], jobDir: string): Promise<Segment[]> {

  // ── Pass 1: measure all durations ─────────────────────────────────────────
  const info = await Promise.all(
    segments.map(async (seg, idx) => {
      const prev = idx > 0 ? segments[idx - 1] : null;
      const naturalGap = prev
        ? Math.max(0, seg.startTime - prev.endTime)
        : seg.startTime;

      if (!seg.audioFile) return { idx, seg, actual: 0, naturalGap, ratio: 0 };
      const actual = await getAudioDuration(seg.audioFile);
      const ratio  = seg.targetDuration > 0 ? actual / seg.targetDuration : 0;
      return { idx, seg, actual, naturalGap, ratio };
    })
  );

  const valid = info.filter((d) => d.actual > 0);
  if (valid.length === 0) return segments;
  if (Math.max(...valid.map((d) => d.ratio)) <= 1.0) return segments; // all fit

  // ── Pass 2: determine global factor (case 4 check) ────────────────────────
  // Case 4 is needed when even 1.20x + full natural gap isn't enough
  const case4Segs = valid.filter((d) => {
    if (d.ratio <= 1.0) return false;
    return d.actual / (d.naturalGap + d.seg.targetDuration) > MAX_PER_SEGMENT;
  });

  // Global X = minimum factor that makes every case-4 segment fit in its window
  const globalFactor = case4Segs.length > 0
    ? Math.max(...case4Segs.map((d) => d.ratio))
    : 1.0;

  // ── Pass 3: apply speed-up filters ────────────────────────────────────────
  const result = [...segments];
  const durations: Map<number, number> = new Map(); // idx → audio duration after processing

  for (const { idx, seg, actual, ratio } of valid) {
    if (!seg.audioFile) { durations.set(idx, 0); continue; }

    if (ratio <= 1.0) {
      // Case 1: fits, no change
      durations.set(idx, actual);

    } else if (ratio <= MAX_PER_SEGMENT) {
      // Case 2: per-segment speed-up, exact ratio
      const out = path.join(jobDir, `seg_${seg.id}_spd.wav`);
      await ffmpeg(['-i', seg.audioFile, '-filter:a', buildAtempo(ratio), out]);
      result[idx] = { ...result[idx], audioFile: out };
      durations.set(idx, seg.targetDuration); // fits exactly

    } else if (globalFactor <= 1.0 || !case4Segs.find((d) => d.idx === idx)) {
      // Case 3: ratio > 1.20x but not in case4 list — 1.20x gets it close enough
      const out = path.join(jobDir, `seg_${seg.id}_spd.wav`);
      await ffmpeg(['-i', seg.audioFile, '-filter:a', buildAtempo(MAX_PER_SEGMENT), out]);
      result[idx] = { ...result[idx], audioFile: out };
      durations.set(idx, actual / MAX_PER_SEGMENT);

    } else {
      // Case 4: apply global factor — only to overflowing segments
      const out = path.join(jobDir, `seg_${seg.id}_spd.wav`);
      await ffmpeg(['-i', seg.audioFile, '-filter:a', buildAtempo(globalFactor), out]);
      result[idx] = { ...result[idx], audioFile: out };
      durations.set(idx, actual / globalFactor);
    }
  }

  return result;
}

function buildAtempo(factor: number): string {
  if (factor <= 2.0) return `atempo=${factor.toFixed(4)}`;
  const half = Math.sqrt(factor);
  return `atempo=${half.toFixed(4)},atempo=${half.toFixed(4)}`;
}
