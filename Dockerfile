FROM node:20-slim

# Нативные зависимости для sharp, canvas и сборки модулей
RUN apt-get update && apt-get install -y \
    python3 make g++ \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

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
