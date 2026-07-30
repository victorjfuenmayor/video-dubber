import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import path from 'path';
import { createJob } from '@/lib/jobs';
import { runPipeline } from '@/lib/pipeline';
import type { PipelineMode } from '@/lib/pipeline';
import type { TargetLang } from '@/lib/voices';
import { VOICES } from '@/lib/voices';
import { sendJobReportEmail } from '@/lib/notify';

export const maxDuration = 600;

const TMP_DIR = path.join(process.cwd(), 'tmp');

function parseTargetLang(value: unknown): TargetLang {
  if (value === 'pt-BR') return 'pt-BR';
  if (value === 'ja') return 'ja';
  return 'es';
}

function parseMode(value: unknown): PipelineMode {
  if (value === 'subtitle') return 'subtitle';
  return 'dub';
}

// Render (and most reverse-proxy hosts) pass the real client IP via
// x-forwarded-for — a comma-separated list where the first entry is the
// original client. req.ip isn't populated on Node.js runtimes (only Edge).
function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? '';
  const jobId = randomUUID();
  const job = createJob(jobId);
  job.status = 'running';

  let input: Parameters<typeof runPipeline>[0];
  let voiceId: string | undefined;
  let targetLang: TargetLang = 'es';
  let mode: PipelineMode = 'dub';

  if (contentType.includes('multipart/form-data')) {
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Failed to read uploaded file. The file may be too large or the upload was interrupted.' }, { status: 400 });
    }
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    const data = await file.arrayBuffer();
    voiceId = form.get('voiceId') as string | undefined ?? undefined;
    targetLang = parseTargetLang(form.get('targetLang'));
    mode = parseMode(form.get('mode'));
    job.originalName = file.name.replace(/\.[^.]+$/, ''); // strip extension
    input = { type: 'upload', data };
  } else {
    const body = await req.json();
    if (!body?.url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    voiceId = body.voiceId;
    targetLang = parseTargetLang(body.targetLang);
    mode = parseMode(body.mode);
    job.sourceUrl = body.url;
    input = { type: 'youtube', url: body.url };
  }

  console.log(`[dub] jobId=${jobId} mode=${mode} targetLang=${targetLang}`);
  const voiceName = VOICES.find(v => v.id === voiceId)?.name ?? voiceId ?? 'unknown';
  job.voiceName = voiceName;
  job.targetLang = targetLang;
  job.mode = mode;
  job.clientIp = getClientIp(req);

  // Fire pipeline async — do not await
  runPipeline(input, jobId, job.events, TMP_DIR, voiceId, targetLang, mode)
    .then((outputPath: string) => {
      job.status = 'done';
      job.outputPath = outputPath;
      sendJobReportEmail(jobId, job);
    })
    .catch((err: Error) => {
      job.status = 'error';
      job.error = err.message;
      sendJobReportEmail(jobId, job);
    });

  return NextResponse.json({ jobId });
}
