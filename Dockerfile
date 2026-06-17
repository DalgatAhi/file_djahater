FROM node:20-slim

# Нативные зависимости + yt-dlp для скачивания видео
RUN apt-get update && apt-get install -y \
    python3 make g++ curl \
    --no-install-recommends && \
    curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp && \
    rm -rf /var/lib/apt/lists/*

ENV YTDLP_PATH=yt-dlp

WORKDIR /app

# Зависимости frontend
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm ci

# Сборка frontend
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Зависимости backend (production only)
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Исходники backend
COPY backend/ ./backend/

# Временные директории для файлов
RUN mkdir -p backend/uploads backend/compressed

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000

CMD ["node", "backend/server.js"]
