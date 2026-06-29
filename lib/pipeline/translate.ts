import Anthropic from '@anthropic-ai/sdk';
import type { Segment } from './types';
import type { TargetLang } from '@/lib/voices';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: 'https://api.anthropic.com',
});

// Spanish natural speaking pace: ~2.2 words/second, ~12 chars/second
const CHARS_PER_SECOND = 12;

// Brazilian Portuguese natural speaking pace: ~13 chars/second
const CHARS_PER_SECOND_PT = 13;

const TRANSLATE_PROMPT = `You are a professional dubbing adaptor for Latin American Spanish, specializing in identity security, AI identity, and cybersecurity content.

Your job: produce a Spanish translation that fits naturally within the given time window when spoken aloud.

TIMING RULE — most important:
- Spanish natural speaking pace: ~12 characters per second (including spaces)
- You receive "secs": the exact seconds available for this segment
- Target character count ≈ secs × 12
- If direct translation is too long: paraphrase, use shorter synonyms, compress the idea — do NOT cut a sentence mid-thought
- If direct translation fits or is shorter: use it as-is

LANGUAGE RULES:
- Latin American Spanish ONLY — never Spain Spanish
  ordenador→computadora, móvil→celular, coche→carro, vosotros→ustedes, vale→okay/de acuerdo, coger→tomar/agarrar
- Natural spoken register — how a professional would explain this out loud, not formal written prose
- Domain vocabulary: autenticación, autorización, identidad digital, proveedor de identidad, gestión de acceso, credenciales, token, permisos, roles, amenaza, vulnerabilidad, IA, modelo de IA, agente, usuario final

TECHNICAL TERMS — keep in English exactly as written:
Auth0, OAuth2, SAML, OIDC, Okta, SSO, JWT, API, SDK, CLI, LDAP, SCIM, SaaS, IDP, SP, Zero Trust, RBAC, ABAC — and any product name, acronym, or technical protocol

EXCEPTIONS — translate these to Latin American Spanish:
- MFA → "MFA" (keep the abbreviation as-is; it will be read letter by letter: M-F-A)
- $ or "Dollars" / "Dollar" → "dólares"

Input: JSON object {"id": {"text": "English text", "secs": N}}
Output: JSON object {"id": "Spanish translation"}
Every input id must appear in the output.`;

const REVIEW_PROMPT = `You are a Latin American Spanish dubbing quality reviewer specializing in identity security and AI content.

Review each translation against its time budget. Return improved versions.

CHECK:
1. TIMING: Does the text fit in "secs" seconds at ~12 chars/second? If too long, shorten with synonyms. If fine, leave it.
2. LATIN AMERICAN: Fix any Spain Spanish (ordenador, móvil, vosotros, vale, coche) → Latin American equivalents
3. TECHNICAL TERMS: Auth0, OAuth2, SAML, Okta, SSO, JWT, API, SDK, etc. must stay in English exactly
   EXCEPTIONS: MFA stays as "MFA" (abbreviated, read as M-F-A); "$" or "Dollars" → "dólares"
4. NATURALNESS: Reads like spoken explanation, not translated text

Input: JSON object {"id": {"translation": "Spanish text", "secs": N}}
Output: JSON object {"id": "improved Spanish translation"}
Every input id must appear in the output.`;

const TRANSLATE_PROMPT_PT = `You are a professional dubbing adaptor for Brazilian Portuguese, specializing in identity security, AI identity, and cybersecurity content.

Your job: produce a Brazilian Portuguese translation that fits naturally within the given time window when spoken aloud.

TIMING RULE — most important:
- Brazilian Portuguese natural speaking pace: ~13 characters per second (including spaces)
- You receive "secs": the exact seconds available for this segment
- Target character count ≈ secs × 13
- If direct translation is too long: paraphrase, use shorter synonyms, compress the idea — do NOT cut a sentence mid-thought
- If direct translation fits or is shorter: use it as-is

LANGUAGE RULES:
- Brazilian Portuguese ONLY — use você (never vós/vós), computador (not ordenador), celular (not telemóvel), carro (not coche), IA (not AI when speaking)
- Natural spoken register — how a professional would explain this out loud, not formal written prose
- Domain vocabulary: autenticação, autorização, identidade digital, provedor de identidade, gerenciamento de acesso, credenciais, token, permissões, funções, ameaça, vulnerabilidade, IA, modelo de IA, agente, usuário final

TECHNICAL TERMS — keep in English exactly as written:
Auth0, OAuth2, SAML, OIDC, Okta, SSO, JWT, API, SDK, CLI, LDAP, SCIM, SaaS, IDP, SP, Zero Trust, RBAC, ABAC — and any product name, acronym, or technical protocol

EXCEPTIONS — translate/adapt these:
- MFA → "MFA" (keep the abbreviation as-is; it will be read letter by letter in Portuguese: M-F-A)
- $ or "Dollars" / "Dollar" → "dólares"

Input: JSON object {"id": {"text": "English text", "secs": N}}
Output: JSON object {"id": "Brazilian Portuguese translation"}
Every input id must appear in the output.`;

const REVIEW_PROMPT_PT = `You are a Brazilian Portuguese dubbing quality reviewer specializing in identity security and AI content.

Review each translation against its time budget. Return improved versions.

CHECK:
1. TIMING: Does the text fit in "secs" seconds at ~13 chars/second? If too long, shorten with synonyms. If fine, leave it.
2. BRAZILIAN PORTUGUESE: Ensure você (not vós), computador (not ordenador/computadora), celular (not telemóvel), carro, IA (not AI when speaking). Fix any European Portuguese forms.
3. TECHNICAL TERMS: Auth0, OAuth2, SAML, Okta, SSO, JWT, API, SDK, etc. must stay in English exactly
   EXCEPTIONS: MFA stays as "MFA" (abbreviated, read as M-F-A); "$" or "Dollars" → "dólares"
4. NATURALNESS: Reads like spoken explanation, not translated text

Input: JSON object {"id": {"translation": "Brazilian Portuguese text", "secs": N}}
Output: JSON object {"id": "improved Brazilian Portuguese translation"}
Every input id must appear in the output.`;

interface TranslateInput {
  text: string;
  secs: number;
  targetChars: number;
}

interface ReviewInput {
  translation: string;
  secs: number;
}

async function claudeCall<T>(
  systemPrompt: string,
  input: Record<number, T>,
  userMsg: string,
): Promise<Record<number, string>> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: `${userMsg}\n\n${JSON.stringify(input)}` }],
  });
  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected Claude response type');
  const match = content.text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Failed to parse Claude response: ${content.text.slice(0, 200)}`);
  return JSON.parse(match[0]) as Record<number, string>;
}

async function translateSingle(seg: Segment, targetLang: TargetLang): Promise<string> {
  const charsPerSec = targetLang === 'pt-BR' ? CHARS_PER_SECOND_PT : CHARS_PER_SECOND;
  const targetChars = Math.round(seg.targetDuration * charsPerSec);
  const translatePrompt = targetLang === 'pt-BR' ? TRANSLATE_PROMPT_PT : TRANSLATE_PROMPT;
  const langLabel = targetLang === 'pt-BR' ? 'Brazilian Portuguese' : 'Latin American Spanish';
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 512,
    system: translatePrompt,
    messages: [{
      role: 'user',
      content: `Translate to ${langLabel}. Time budget: ${seg.targetDuration.toFixed(1)}s (~${targetChars} chars). Return only the translated text.\n\n${seg.originalText}`,
    }],
  });
  const content = message.content[0];
  if (content.type !== 'text') throw new Error('Unexpected Claude response type');
  return content.text.trim();
}

export async function translateSegments(segments: Segment[], targetLang: TargetLang = 'es'): Promise<Segment[]> {
  const BATCH_SIZE = 20;
  const result = [...segments];
  const charsPerSec = targetLang === 'pt-BR' ? CHARS_PER_SECOND_PT : CHARS_PER_SECOND;
  const translatePrompt = targetLang === 'pt-BR' ? TRANSLATE_PROMPT_PT : TRANSLATE_PROMPT;
  const reviewPrompt = targetLang === 'pt-BR' ? REVIEW_PROMPT_PT : REVIEW_PROMPT;

  for (let i = 0; i < segments.length; i += BATCH_SIZE) {
    const batch = segments.slice(i, i + BATCH_SIZE);

    // Pass 1: timing-aware translation
    const translateInput: Record<number, TranslateInput> = {};
    for (const seg of batch) {
      translateInput[seg.id] = {
        text: seg.originalText,
        secs: parseFloat(seg.targetDuration.toFixed(2)),
        targetChars: Math.round(seg.targetDuration * charsPerSec),
      };
    }

    const translations = await claudeCall(
      translatePrompt,
      translateInput,
      'Translate each segment. Fit within the secs budget. Return JSON with same numeric keys.',
    );

    // Fallback for missing IDs
    for (const seg of batch) {
      if (!translations[seg.id]) translations[seg.id] = await translateSingle(seg, targetLang);
    }

    // Pass 2: review timing + language authenticity
    const reviewInput: Record<number, ReviewInput> = {};
    for (const seg of batch) {
      reviewInput[seg.id] = {
        translation: translations[seg.id],
        secs: parseFloat(seg.targetDuration.toFixed(2)),
      };
    }

    const reviewed = await claudeCall(
      reviewPrompt,
      reviewInput,
      'Review and improve each translation. Return JSON with same numeric keys.',
    );

    for (const seg of batch) {
      const idx = segments.indexOf(seg);
      result[idx] = {
        ...result[idx],
        translatedText: reviewed[seg.id] ?? translations[seg.id],
      };
    }
  }

  return result;
}
