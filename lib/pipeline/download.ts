import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function saveUploadedFile(
  arrayBuffer: ArrayBuffer,
  jobDir: string
): Promise<string> {
  const outPath = path.join(jobDir, 'input.mp4');
  await fs.promises.writeFile(outPath, Buffer.from(arrayBuffer));
  return outPath;
}

export async function downloadYouTube(url: string, jobDir: string): Promise<string> {
  const outPath = path.join(jobDir, 'input.mp4');

  // Write cookies to a temp file if provided via env var
  let cookiesPath: string | null = null;
  const cookiesContent = process.env.YOUTUBE_COOKIES;
  if (cookiesContent) {
    cookiesPath = path.join(jobDir, 'yt_cookies.txt');
    await fs.promises.writeFile(cookiesPath, cookiesContent);
  }

  return new Promise((resolve, reject) => {
    const ytDlp = process.env.YT_DLP_PATH ?? 'yt-dlp';
    const usingTailscale = !!process.env.TAILSCALE_EXIT_NODE;
    const args = [
      '--merge-output-format', 'mp4',
      '-v',
      '--socket-timeout', '60',
      '--retries', '1',
      '-o', outPath,
    ];
    if (cookiesPath) args.push('--cookies', cookiesPath);
    // Note: proxy is set via HTTPS_PROXY/ALL_PROXY env vars above, not --proxy flag
    args.push(url);

    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PATH: `/usr/local/bin:${process.env.PATH ?? ''}`,
    };
    // Route ALL yt-dlp traffic (including challenge solver downloads) through the proxy
    if (usingTailscale) {
      env.HTTPS_PROXY = 'socks5://127.0.0.1:1055';
      env.HTTP_PROXY  = 'socks5://127.0.0.1:1055';
      env.ALL_PROXY   = 'socks5://127.0.0.1:1055';
    }
    const proc = spawn(ytDlp, args, { stdio: ['ignore', 'pipe', 'pipe'], env });

    let stderr = '';
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve(outPath);
      else reject(new Error(`yt-dlp failed (${code}): ${stderr.slice(-2000)}`));
    });
    proc.on('error', (err) => reject(new Error(`yt-dlp spawn failed: ${err.message}`)));
  });
}
