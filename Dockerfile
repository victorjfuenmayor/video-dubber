FROM node:20-slim

# Install ffmpeg, yt-dlp, and Tailscale
RUN apt-get update && apt-get install -y ffmpeg python3 curl \
  && curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod +x /usr/local/bin/yt-dlp \
  && curl -fsSL https://tailscale.com/install.sh | sh \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
ENV NEXT_PUBLIC_DISABLE_YOUTUBE=true
RUN NODE_OPTIONS=--max-old-space-size=400 npm run build

ENV NODE_ENV=production
ENV FFMPEG_PATH=ffmpeg
ENV YT_DLP_PATH=yt-dlp

EXPOSE 3000

COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
