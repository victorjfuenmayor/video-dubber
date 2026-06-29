import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import path from 'path';
import { createJob } from '@/lib/jobs';
import { runPipeline } from '@/lib/pipeline';
import type { TargetLang } from '@/lib/voices';

const TMP_DIR = path.join(process.cwd(), 'tmp');

function parseTargetLang(value: unknown): TargetLang {
  if (value === 'pt-BR') return 'pt-BR';
  return 'es';
}

export async function POST(req: NextRequest) {
  const contentType = req.headers.get('content-type') ?? '';
  const jobId = randomUUID();
  const job = createJob(jobId);
  job.status = 'running';

  let input: Parameters<typeof runPipeline>[0];
  let voiceId: string | undefined;
  let targetLang: TargetLang = 'es';

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    const data = await file.arrayBuffer();
    voiceId = form.get('voiceId') as string | undefined ?? undefined;
    targetLang = parseTargetLang(form.get('targetLang'));
    input = { type: 'upload', data };
  } else {
    const body = await req.json();
    if (!body?.url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    voiceId = body.voiceId;
    targetLang = parseTargetLang(body.targetLang);
    input = { type: 'youtube', url: body.url };
  }

  // Fire pipeline async — do not await
  runPipeline(input, jobId, job.events, TMP_DIR, voiceId, targetLang)
    .then((outputPath: string) => {
      job.status = 'done';
      job.outputPath = outputPath;
    })
    .catch((err: Error) => {
      job.status = 'error';
      job.error = err.message;
    });

  return NextResponse.json({ jobId });
}
