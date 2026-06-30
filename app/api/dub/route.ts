import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import path from 'path';
import { createJob } from '@/lib/jobs';
import { runPipeline } from '@/lib/pipeline';
import type { PipelineMode } from '@/lib/pipeline';
import type { TargetLang } from '@/lib/voices';

export const maxDuration = 600;

const TMP_DIR = path.join(process.cwd(), 'tmp');

function parseTargetLang(value: unknown): TargetLang {
  if (value === 'pt-BR') return 'pt-BR';
  return 'es';
}

function parseMode(value: unknown): PipelineMode {
  if (value === 'subtitle') return 'subtitle';
  return 'dub';
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
    input = { type: 'upload', data };
  } else {
    const body = await req.json();
    if (!body?.url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 });
    voiceId = body.voiceId;
    targetLang = parseTargetLang(body.targetLang);
    mode = parseMode(body.mode);
    input = { type: 'youtube', url: body.url };
  }

  console.log(`[dub] jobId=${jobId} mode=${mode} targetLang=${targetLang}`);

  // Fire pipeline async — do not await
  runPipeline(input, jobId, job.events, TMP_DIR, voiceId, targetLang, mode)
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
