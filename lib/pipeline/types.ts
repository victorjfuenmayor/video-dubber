export interface Segment {
  id: number;
  startTime: number;
  endTime: number;
  originalText: string;
  translatedText?: string;
  audioFile?: string;
  targetDuration: number;
  speedRatio?: number;
  // Original-language word-level timestamps within this segment, used to
  // place subtitle line-breaks at real speech pauses instead of guessing.
  words?: Array<{ start: number; end: number; text: string }>;
}
