import { Resend } from 'resend';
import type { JobState } from './jobs';

// Loopback/private ranges never resolve to a real location — skip the
// lookup instead of burning an API call on something that'll just fail.
function isPrivateIp(ip: string): boolean {
  return (
    ip === '127.0.0.1' ||
    ip === '::1' ||
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

async function lookupIpLocation(ip: string): Promise<string> {
  if (!ip || ip === 'unknown' || isPrivateIp(ip)) return 'Unknown (local/private IP)';
  try {
    const res = await fetch(`https://ipwho.is/${ip}`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return 'Unknown';
    const data = await res.json();
    if (!data.success) return 'Unknown';
    return [data.city, data.region, data.country].filter(Boolean).join(', ') || 'Unknown';
  } catch {
    return 'Unknown';
  }
}

// Fire-and-forget job completion/failure report to the app owner, reusing
// the same Resend setup as the feedback form. Never throws — a notification
// failure must not affect the user's actual job outcome.
export async function sendJobReportEmail(jobId: string, job: JobState): Promise<void> {
  const toEmail = process.env.FEEDBACK_TO_EMAIL;
  if (!toEmail) return;

  try {
    const fromEmail = process.env.FEEDBACK_FROM_EMAIL ?? 'feedback@videodubber.app';
    const resend = new Resend(process.env.RESEND_API_KEY);

    const durationSec = Math.round((Date.now() - job.createdAt) / 1000);
    const modeLabel = job.mode === 'subtitle' ? 'Subtitles' : 'Dubbing';
    const statusLabel = job.status === 'done' ? 'Completed' : 'Failed';
    const location = await lookupIpLocation(job.clientIp ?? '');

    const rows: [string, string][] = [
      ['Video', job.originalName ?? job.sourceUrl ?? 'unknown'],
      ['Mode', modeLabel],
      ['Status', statusLabel],
      ['Target language', job.targetLang ?? 'unknown'],
    ];
    if (job.mode !== 'subtitle' && job.voiceName) rows.push(['Voice', job.voiceName]);
    rows.push(['Duration', `${durationSec}s`]);
    rows.push(['IP address', job.clientIp ?? 'unknown']);
    rows.push(['Location', location]);
    rows.push(['Job ID', jobId]);
    if (job.status === 'error' && job.error) rows.push(['Error', job.error]);

    await resend.emails.send({
      from: `Video Dubber <${fromEmail}>`,
      to: toEmail,
      subject: `[${statusLabel}] ${modeLabel} — ${job.originalName ?? job.sourceUrl ?? jobId.slice(0, 8)}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:560px;padding:24px">
          <h2 style="margin:0 0 16px;font-size:18px;color:#0f172a">${modeLabel} job ${statusLabel.toLowerCase()}</h2>
          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#334155">
            ${rows.map(([k, v]) => `<tr><td style="padding:4px 8px 4px 0;font-weight:600;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:4px 0">${v}</td></tr>`).join('')}
          </table>
        </div>
      `,
    });
  } catch (err) {
    console.error('[notify] Failed to send job report email:', err);
  }
}
