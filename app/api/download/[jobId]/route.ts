import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getJob } from '@/lib/jobs';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job) return new Response('Job not found', { status: 404 });
  if (job.status !== 'done' || !job.outputPath) {
    return new Response('Job not ready', { status: 202 });
  }

  const filePath = job.outputPath;
  if (!fs.existsSync(filePath)) {
    return new Response('Output file not found', { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileStream = fs.createReadStream(filePath);
  const webStream = new ReadableStream({
    start(controller) {
      fileStream.on('data', (chunk) => controller.enqueue(chunk));
      fileStream.on('end', () => {
        controller.close();
        // Clean up job dir after streaming
        const jobDir = path.dirname(filePath);
        fs.rm(jobDir, { recursive: true, force: true }, () => {});
      });
      fileStream.on('error', (err) => controller.error(err));
    },
    cancel() {
      fileStream.destroy();
    },
  });

  const isSrt = filePath.endsWith('.srt');
  return new Response(webStream, {
    headers: {
      'Content-Type': isSrt ? 'application/x-subrip' : 'video/mp4',
      'Content-Length': String(stat.size),
      'Content-Disposition': `attachment; filename="${isSrt ? `subtitles_${jobId.slice(0, 8)}.srt` : `dubbed_${jobId.slice(0, 8)}.mp4`}"`,
    },
  });
}
