import { NextRequest, NextResponse } from 'next/server';

const SAMPLE_TEXT = 'Hola, esta es una muestra de mi voz. Hello, this is a sample of my voice.';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ voiceId: string }> }
) {
  const { voiceId } = await params;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return new Response('Not configured', { status: 500 });

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: SAMPLE_TEXT,
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
