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
  return new Promise((resolve, reject) => {
    const ytDlp = process.env.YT_DLP_PATH ?? 'yt-dlp';
    const proc = spawn(ytDlp, [
      '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
      '--merge-output-format', 'mp4',
      '-o', outPath,
      url,
    ], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve(outPath);
      else reject(new Error(`yt-dlp failed (${code}): ${stderr.slice(-500)}`));
    });
    proc.on('error', (err) => reject(new Error(`yt-dlp spawn failed: ${err.message}`)));
  });
}
