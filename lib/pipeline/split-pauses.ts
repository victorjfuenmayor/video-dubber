import type { Segment } from './types';

// A gap this long between two words is a real speech pause, not just
// natural articulation spacing — a good place to split a subtitle.
const PAUSE_GAP_SECONDS = 0.35;

// Whisper often folds a trailing pause into the *previous* word's own
// duration instead of reporting a gap — especially after sentence-ending
// punctuation. A single word rarely legitimately takes this long to say, so
// treat it as a swallowed pause too.
const LONG_WORD_SECONDS = 0.9;

// No genuine spoken word takes less than this long to say. Whisper
// occasionally hallucinates a short word over background music or ambient
// noise after real speech has ended — a piece this brief is that artifact,
// not real dialogue.
const MIN_SEGMENT_SECONDS = 0.2;

// A narrator can pause dramatically mid-sentence (no terminal punctuation)
// purely for delivery — e.g. "Identity." *beat* "has never been more
// important...". The pause is real, but splitting there strands a tiny,
// grammatically unfinished fragment as its own caption with an empty gap
// after it. A piece this short that doesn't end a sentence gets folded into
// its neighbor instead.
const MIN_WORDS_PER_PIECE = 3;

// Only rescue a short fragment by attaching it to a neighbor that's clearly a
// real continuation — not another short fragment. Whisper's punctuation is
// inconsistent between calls (a run of short lines can lose their periods
// together), and without this guard a chain of several short, unpunctuated
// pieces in a row cascades into one fused into an unrelated later line.
const MIN_MERGE_TARGET_WORDS = 4;

// Splits a segment into multiple segments wherever its own word-level
// timestamps show a real speech pause (Whisper sometimes bundles several
// short sentences into one segment when there's no strong acoustic break).
// This must happen *before* translation: slicing already-translated text
// by word-count proportion can't know where a Spanish/Portuguese clause
// boundary actually falls, and ends up orphaning connector words (e.g. "que")
// onto the wrong side of a cut. Splitting first means each natural phrase is
// translated on its own and comes back grammatically whole.
export function splitSegmentsAtPauses(segments: Segment[]): Segment[] {
  const result: Segment[] = [];
  let nextId = 0;

  for (const seg of segments) {
    const words = seg.words;
    if (!words || words.length < 2) {
      if (seg.endTime - seg.startTime >= MIN_SEGMENT_SECONDS) result.push({ ...seg, id: nextId++ });
      continue;
    }

    const boundaries: number[] = [];
    for (let i = 0; i < words.length - 1; i++) {
      const gap = words[i + 1].start - words[i].end;
      const ownDuration = words[i].end - words[i].start;
      const endsSentence = /[.!?]$/.test(words[i].text.trim());
      if (gap > PAUSE_GAP_SECONDS || (endsSentence && ownDuration > LONG_WORD_SECONDS)) {
        boundaries.push(i);
      }
    }
    if (boundaries.length === 0) {
      if (seg.endTime - seg.startTime >= MIN_SEGMENT_SECONDS) result.push({ ...seg, id: nextId++ });
      continue;
    }

    const ranges: Array<[number, number]> = [];
    let wordStart = 0;
    for (const wordEnd of [...boundaries, words.length - 1]) {
      ranges.push([wordStart, wordEnd]);
      wordStart = wordEnd + 1;
    }

    const wordCount = ([s, e]: [number, number]) => e - s + 1;
    const isUnfinishedFragment = ([s, e]: [number, number]) =>
      wordCount([s, e]) < MIN_WORDS_PER_PIECE && !/[.!?]$/.test(words[e].text.trim());

    for (let i = ranges.length - 2; i >= 0; i--) {
      if (isUnfinishedFragment(ranges[i]) && wordCount(ranges[i + 1]) >= MIN_MERGE_TARGET_WORDS) {
        ranges[i + 1][0] = ranges[i][0];
        ranges.splice(i, 1);
      }
    }
    if (
      ranges.length > 1 &&
      isUnfinishedFragment(ranges[ranges.length - 1]) &&
      wordCount(ranges[ranges.length - 2]) >= MIN_MERGE_TARGET_WORDS
    ) {
      ranges[ranges.length - 2][1] = ranges[ranges.length - 1][1];
      ranges.pop();
    }

    for (const [s, e] of ranges) {
      const slice = words.slice(s, e + 1);
      const start = slice[0].start;
      const end = slice[slice.length - 1].end;
      if (end - start >= MIN_SEGMENT_SECONDS) {
        result.push({
          id: nextId++,
          startTime: start,
          endTime: end,
          originalText: slice.map((w) => w.text).join(' '),
          targetDuration: end - start,
          words: slice,
        });
      }
    }
  }

  return result;
}
