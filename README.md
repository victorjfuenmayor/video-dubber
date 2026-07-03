# Video Dubber

AI-powered video dubbing and subtitling app. Upload a video in English and get it dubbed or subtitled in **Latin American Spanish** or **Brazilian Portuguese** — with natural-sounding voices powered by ElevenLabs.

## Features

- **Audio Dubbing** — translates and re-voices the video with AI voices
- **Subtitles** — generates a synced `.srt` subtitle file
- **9 Spanish voices** + **9 Portuguese BR voices** with audio preview
- **Auto subtitle sync** via ffsubsync
- Light/dark mode · EN/ES/PT UI · Cancel mid-process

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Transcription | Groq Whisper |
| Translation | Anthropic Claude |
| Text-to-Speech | ElevenLabs |
| Audio/Video | FFmpeg |
| Subtitle sync | ffsubsync |
| Emails | Resend |

## Local Setup

### Prerequisites

```bash
# Node.js 20+
brew install node

# FFmpeg with libass (for subtitle burning)
brew install homebrew-ffmpeg/ffmpeg/ffmpeg

# yt-dlp (optional, for YouTube URLs)
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
  -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp

# ffsubsync (subtitle auto-sync)
brew install pipx && pipx install ffsubsync
```

### Environment

```bash
cp .env.example .env.local
# Fill in your API keys in .env.local
```

### Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | ✅ | Whisper transcription |
| `ANTHROPIC_API_KEY` | ✅ | Claude translation |
| `ELEVENLABS_API_KEY` | ✅ | Text-to-speech voices |
| `RESEND_API_KEY` | optional | Feedback emails |
| `FEEDBACK_TO_EMAIL` | optional | Where feedback emails go |
| `FFMPEG_PATH` | optional | Override ffmpeg binary path |
| `YT_DLP_PATH` | optional | Override yt-dlp binary path |

## Limitations

- **Max ~10 minutes** per video (Groq Whisper 25MB audio limit)
- YouTube URL support requires local setup (cloud IPs are blocked by YouTube)

## Deploy

Includes a `Dockerfile` for deployment on Render or any Docker host. See `.env.example` for all required environment variables.
