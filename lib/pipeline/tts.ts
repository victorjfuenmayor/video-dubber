import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import type { Segment } from './types';
import type { TargetLang } from '@/lib/voices';

export { VOICES, DEFAULT_VOICE_ID } from '@/lib/voices';

const ELEVENLABS_MODEL = 'eleven_turbo_v2_5';
const FFMPEG = process.env.FFMPEG_PATH ?? 'ffmpeg';

// Map written forms to how they should be spoken aloud (Spanish).
// TTS engines often misread product names that contain digits or unusual spellings.
const PRONUNCIATION_MAP: [RegExp, string][] = [
  // Currency — replace $ sign and English "Dollars/Dollar" with Spanish
  [/\$\s*([\d,]+\.?\d*)/g,          '$1 dólares'],
  [/\b(dollars?)\b/gi,              'dólares'],

  // Acronyms — English letter-words so multilingual model reads them in English
  [/\bMFA\b/g,                      'em eff ay'],
  [/\bMCP(?!\w)/g,                   'Emsipi'],

  // AI product names — use English letter-words so multilingual model reads them in English
  [/\bChatGPT(?!\w)/gi,             'Chatgeepeetee'],
  [/\bGPT-?4o(?!\w)/gi,             'gee pee tee four oh'],
  [/\bGPT-?4(?!\w)/gi,              'gee pee tee four'],
  [/\bGPT-?3\.5(?!\w)/gi,           'gee pee tee three point five'],
  [/\bGPT(?!\w)/g,                  'gee pee tee'],

  // Versioned protocols / product names with digits
  [/\bAuth0\b/g,                    'AuthZiro'],
  [/\bOAuth2\.0\b/gi,               'OAuth 2 point 0'],
  [/\bOAuth2\b/gi,                  'OAuth 2'],
  [/\bSAMLv2\b/gi,                  'SAML version 2'],
  [/\bOpenID\b/gi,                  'Open I D'],
  [/\bLDAPv3\b/gi,                  'LDAP version 3'],
  [/\bSCIMv2\b/gi,                  'SCIM version 2'],
  [/\bW3C\b/g,                      'W 3 C'],
  [/\bWebAuthn\b/gi,                'Web Authn'],
  [/\bFIDO2\b/gi,                   'FIDO 2'],
  [/\bU2F\b/g,                      'U 2 F'],
];

// Brazilian Portuguese pronunciation map.
// Letter names in PT: A=á, B=bê, C=cê, D=dê, E=ê, F=éfe, G=gê, H=agá,
// I=í, J=jota, K=cá, L=éle, M=ême, N=êne, O=ô, P=pê, Q=quê, R=érre,
// S=ésse, T=tê, U=u, V=vê, W=dáblio, X=xis, Y=ípsilon, Z=zê
const PRONUNCIATION_MAP_PT: [RegExp, string][] = [
  // Currency
  [/\$\s*([\d,]+\.?\d*)/g,          '$1 dólares'],
  [/\b(dollars?)\b/gi,              'dólares'],

  // Acronyms in PT letter names
  [/\bMFA\b/g,                      'em efe á'],
  [/\bMCP(?!\w)/g,                   'em cê pê'],

  // AI product names in PT letter names
  [/\bChatGPT(?!\w)/gi,             'Chat jê pê tê'],
  [/\bGPT-?4o(?!\w)/gi,             'jê pê tê quatro ô'],
  [/\bGPT-?4(?!\w)/gi,              'jê pê tê quatro'],
  [/\bGPT-?3\.5(?!\w)/gi,           'jê pê tê três ponto cinco'],
  [/\bGPT(?!\w)/g,                  'jê pê tê'],

  // Versioned protocols / product names with digits
  [/\bAuth0\b/g,                    'AuthZiro'],
  [/\bOAuth2\.0\b/gi,               'OAuth 2 ponto 0'],
  [/\bOAuth2\b/gi,                  'OAuth 2'],
  [/\bSAMLv2\b/gi,                  'SAML versão 2'],
  [/\bOpenID\b/gi,                  'Open I D'],
  [/\bLDAPv3\b/gi,                  'LDAP versão 3'],
  [/\bSCIMv2\b/gi,                  'SCIM versão 2'],
  [/\bW3C\b/g,                      'W 3 C'],
  [/\bWebAuthn\b/gi,                'Web Authn'],
  [/\bFIDO2\b/gi,                   'FIDO 2'],
  [/\bU2F\b/g,                      'U 2 F'],
];

function normalizePronunciation(text: string, targetLang: TargetLang): string {
  const map = targetLang === 'pt-BR' ? PRONUNCIATION_MAP_PT : PRONUNCIATION_MAP;
  let out = text;
  for (const [pattern, replacement] of map) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

async function generateSegmentAudio(
  text: string,
  outputPath: string,
  voiceId: string,
  targetLang: TargetLang,
): Promise<void> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not set');

  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: normalizePronunciation(text, targetLang),
        model_id: ELEVENLABS_MODEL,
        // No language_code — the multilingual model auto-detects per word,
        // so English technical terms embedded in translated text are pronounced in English.
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
        output_format: 'mp3_44100_128',
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${errText.slice(0, 300)}`);
  }

  // Save MP3 then let ffmpeg decode to WAV — avoids any PCM sample-rate guesswork
  const mp3Path = outputPath.replace(/\.wav$/, '.mp3');
  fs.writeFileSync(mp3Path, Buffer.from(await res.arrayBuffer()));
  await mp3ToWav(mp3Path, outputPath);
}

function mp3ToWav(mp3Path: string, wavPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, [
      '-y', '-i', mp3Path,
      '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le',
      wavPath,
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`mp3→wav failed: ${stderr.slice(-300)}`));
    });
    proc.on('error', (err) => reject(err));
  });
}

export async function generateTTS(
  segments: Segment[],
  jobDir: string,
  voiceId: string,
  targetLang: TargetLang = 'es',
): Promise<Segment[]> {
  const result = [...segments];

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg.translatedText) continue;

    const audioFile = path.join(jobDir, `seg_${seg.id}.wav`);
    await generateSegmentAudio(seg.translatedText, audioFile, voiceId, targetLang);
    result[i] = { ...result[i], audioFile };
  }

  return result;
}
