import type { Segment } from './types';

// A gap this long between two words is a real speech pause, not just
// natural articulation spacing — a good place to split a subtitle.
const PAUSE_GAP_SECONDS = 0.35;

// Whisper often folds a trailing pause into the *previous* word's own
// duration instead of reporting a gap — especially after sentence-ending
// punctuation. A single word rarely legitimately takes this long to say, so
// treat it as a swallowed pause too.
const LONG_WORD_SECONDS = 0.9;

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
      result.push({ ...seg, id: nextId++ });
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
      result.push({ ...seg, id: nextId++ });
      continue;
    }

    let wordStart = 0;
    for (const wordEnd of [...boundaries, words.length - 1]) {
      const slice = words.slice(wordStart, wordEnd + 1);
      result.push({
        id: nextId++,
        startTime: slice[0].start,
        endTime: slice[slice.length - 1].end,
        originalText: slice.map((w) => w.text).join(' '),
        targetDuration: slice[slice.length - 1].end - slice[0].start,
        words: slice,
      });
      wordStart = wordEnd + 1;
    }
  }

  return result;
}
