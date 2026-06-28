import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { type, message, name, email } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 });
  }

  const toEmail = process.env.FEEDBACK_TO_EMAIL;
  const fromEmail = process.env.FEEDBACK_FROM_EMAIL ?? 'feedback@videodubber.app';

  if (!toEmail) {
    return NextResponse.json({ error: 'FEEDBACK_TO_EMAIL is not configured' }, { status: 500 });
  }

  try {
    await resend.emails.send({
      from: `Video Dubber Feedback <${fromEmail}>`,
      to: toEmail,
      replyTo: email || undefined,
      subject: `[${type ?? 'Feedback'}] Video Dubber`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;padding:24px">
          <h2 style="margin:0 0 16px;font-size:18px;color:#0f172a">New ${type ?? 'Feedback'}</h2>
          ${name    ? `<p style="margin:0 0 4px"><strong>Name:</strong> ${name}</p>` : ''}
          ${email   ? `<p style="margin:0 0 16px"><strong>Email:</strong> ${email}</p>` : ''}
          <div style="background:#f8fafc;border-radius:8px;padding:16px;white-space:pre-wrap;color:#334155;font-size:15px;line-height:1.6">${message}</div>
        </div>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to send email';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
