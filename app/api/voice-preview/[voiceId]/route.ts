import { NextRequest, NextResponse } from 'next/server';

const SAMPLE_BY_LANG: Record<string, string> = {
  'es':    'Okta protege todo tipo de identidad, desde agentes de IA hasta tus clientes, empleados y socios. Okta secures all types of identity, from AI agents to your customers, employees, and partners.',
  'pt-BR': 'Okta protege todos os tipos de identidade, de agentes de IA aos seus clientes, funcionários e parceiros. Okta secures all types of identity, from AI agents to your customers, employees, and partners.',
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ voiceId: string }> }
) {
  const { voiceId } = await params;
  const lang = req.nextUrl.searchParams.get('lang') ?? 'es';
  const sampleText = SAMPLE_BY_LANG[lang] ?? SAMPLE_BY_LANG['es'];
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return new Response('Not configured', { status: 500 });

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: sampleText,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        output_format: 'mp3_44100_128',
      }),
    }
  );

  if (!res.ok) return new Response('Preview unavailable', { status: 502 });

  const contentType = res.headers.get('content-type') ?? 'audio/mpeg';
  return new Response(res.body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
