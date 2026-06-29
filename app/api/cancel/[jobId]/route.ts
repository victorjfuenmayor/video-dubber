import { NextRequest, NextResponse } from 'next/server';
import { getJob } from '@/lib/jobs';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const job = getJob(jobId);

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  job.cancelled = true;
  job.events.emit('error', new Error('Cancelled'));

  return NextResponse.json({ ok: true });
}
