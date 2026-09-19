FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends python3 ffmpeg curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
  && chmod +x /usr/local/bin/yt-dlp

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./

EXPOSE 8080

CMD ["node", "server.js"]
