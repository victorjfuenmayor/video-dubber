import type { Segment } from './types';

// Merge consecutive segments that form the same sentence BEFORE translation,
// so the translator knows the full time window when choosing words.
export function mergeSentenceSegments(segments: Segment[]): Segment[] {
  if (segments.length === 0) return segments;

  const merged: Segment[] = [];
  let buffer: Segment[] = [];

  for (const seg of segments) {
    buffer.push(seg);
    if (isSentenceEnd(seg.originalText)) {
      merged.push(mergeGroup(buffer));
      buffer = [];
    }
  }

  if (buffer.length > 0) merged.push(mergeGroup(buffer));

  return merged;
}

function isSentenceEnd(text: string): boolean {
  return /[.!?]\s*$/.test(text.trim());
}

function mergeGroup(segs: Segment[]): Segment {
  if (segs.length === 1) return segs[0];

  const first = segs[0];
  const last = segs[segs.length - 1];

  return {
    id: first.id,
    startTime: first.startTime,
    endTime: last.endTime,
    targetDuration: last.endTime - first.startTime,
    originalText: segs.map((s) => s.originalText).join(' '),
  };
}
