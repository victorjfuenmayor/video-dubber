@AGENTS.md

# Video Dubber — Claude Code Context

## What this app does
AI video dubbing and subtitling pipeline. Takes an English video, transcribes it (Groq Whisper), translates it (Claude), generates dubbed audio (ElevenLabs TTS) or an SRT subtitle file, and muxes everything back into a video.

## Key architecture

```
Upload/YouTube → Extract Audio → Transcribe → Translate → TTS + Timing → Mux
                                                         ↘ (subtitle mode) → SRT → ffsubsync
```

## Important files

| File | Purpose |
|------|---------|
| `lib/pipeline/index.ts` | Main pipeline orchestration |
| `lib/pipeline/transcribe.ts` | Groq Whisper, speech onset correction |
| `lib/pipeline/translate.ts` | Claude translation with timing calibration |
| `lib/pipeline/tts.ts` | ElevenLabs TTS + pronunciation maps (ES + PT-BR) |
| `lib/pipeline/timing.ts` | Speed-match dubbed audio to original timing |
| `lib/pipeline/mux.ts` | Assemble final video with FFmpeg |
| `lib/pipeline/subtitle-burn.ts` | SRT generation + ffsubsync auto-sync |
| `lib/pipeline/download.ts` | yt-dlp YouTube download (with Tailscale proxy support) |
| `lib/voices.ts` | ES and PT-BR voice IDs for ElevenLabs |
| `lib/i18n.ts` | EN/ES/PT UI translations |
| `app/globals.css` | CSS design tokens (light + dark mode) |

## Supported languages
- **Dubbing/Subtitles**: English → Latin American Spanish, English → Brazilian Portuguese
- **UI**: English, Spanish, Portuguese

## Key constraints
- Groq Whisper: 25MB audio limit → max ~10 min video
- TTS: segments are speed-matched to fit original timing (max 1.2x)
- Subtitle mode skips TTS/timing and outputs `.srt` + ffsubsync sync

## Local dev
```bash
npm run dev   # http://localhost:3000
```
Requires: ffmpeg (with libass for subtitles), yt-dlp, ffsubsync, and API keys in `.env.local`.

## Production
Deployed on Render via Dockerfile. `NEXT_PUBLIC_DISABLE_YOUTUBE=true` is baked in at build time to hide the YouTube URL option in production.
