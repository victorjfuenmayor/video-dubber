export interface Segment {
  id: number;
  startTime: number;
  endTime: number;
  originalText: string;
  translatedText?: string;
  audioFile?: string;
  targetDuration: number;
  speedRatio?: number;
}
