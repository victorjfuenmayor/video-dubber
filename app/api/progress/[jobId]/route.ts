import { NextRequest } from 'next/server';
import { getJob } from '@/lib/jobs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job) {
    return new Response('Job not found', { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // If job already completed/errored before client connected
      if (job.status === 'done') {
        send({ step: 'complete', jobId });
        controller.close();
        return;
      }
      if (job.status === 'error') {
        send({ step: 'error', message: job.error ?? 'Unknown error' });
        controller.close();
        return;
      }

      const onProgress = (data: object) => send(data);
      const onComplete = ({ outputPath }: { outputPath: string }) => {
        void outputPath;
        send({ step: 'complete', jobId });
        cleanup();
        controller.close();
      };
      const onError = (err: Error) => {
        send({ step: 'error', message: err.message });
        cleanup();
        controller.close();
      };

      // Send keepalive comment every 20s to prevent proxy/Render from closing idle SSE connections
      const keepalive = setInterval(() => {
        controller.enqueue(encoder.encode(': keepalive\n\n'));
      }, 20000);

      const cleanup = () => {
        clearInterval(keepalive);
        job.events.off('progress', onProgress);
        job.events.off('complete', onComplete);
        job.events.off('error', onError);
      };

      job.events.on('progress', onProgress);
      job.events.once('complete', onComplete);
      job.events.once('error', onError);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
