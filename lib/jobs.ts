import { EventEmitter } from 'events';

export type JobStatus = 'queued' | 'running' | 'done' | 'error';

export interface JobState {
  status: JobStatus;
  events: EventEmitter;
  outputPath: string | null;
  error: string | null;
  createdAt: number;
  cancelled: boolean;
}

const jobs = new Map<string, JobState>();

export function createJob(jobId: string): JobState {
  const job: JobState = {
    status: 'queued',
    events: new EventEmitter(),
    outputPath: null,
    error: null,
    createdAt: Date.now(),
    cancelled: false,
  };
  jobs.set(jobId, job);
  scheduleCleanup(jobId);
  return job;
}

export function getJob(jobId: string): JobState | undefined {
  return jobs.get(jobId);
}

function scheduleCleanup(jobId: string) {
  setTimeout(() => {
    const job = jobs.get(jobId);
    if (job) {
      job.events.removeAllListeners();
      jobs.delete(jobId);
    }
  }, 60 * 60 * 1000); // 1 hour TTL
}
