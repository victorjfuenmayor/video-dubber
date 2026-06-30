import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ voiceId: string }> }
) {
  const { voiceId } = await params;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  const res = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
    headers: { 'xi-api-key': apiKey },
  });

  if (!res.ok) return NextResponse.json({ error: 'Voice not found' }, { status: 404 });

  const data = await res.json();
  return NextResponse.json({ previewUrl: data.preview_url });
}
