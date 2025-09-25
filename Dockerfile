# Combined Dockerfile for Gatespy (Render-friendly, single service)
# Base: Node for Next.js, plus Python & Chromium for FastAPI+Selenium
FROM node:18-bullseye AS base

ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV NEXT_TELEMETRY_DISABLED=1

# Install Python, pip, Chromium & ChromeDriver
RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    chromium \
    chromium-driver \
    fonts-liberation \
    libnss3 \
    libxss1 \
    libasound2 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# -----------------------
# Install backend deps
# -----------------------
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip3 install --no-cache-dir -r /app/backend/requirements.txt

# Copy backend
COPY backend /app/backend

ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMEDRIVER_BIN=/usr/bin/chromedriver

# -----------------------
# Build frontend
# -----------------------
FROM base AS builder
WORKDIR /app/web
COPY web/package.json web/package-lock.json* web/pnpm-lock.yaml* web/yarn.lock* ./
RUN npm ci || npm install
COPY web ./
RUN npm run build

# -----------------------
# Runtime
# -----------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy built Next.js standalone
COPY --from=builder /app/web/.next/standalone /app/web-standalone
COPY --from=builder /app/web/.next/static /app/web-standalone/.next/static
COPY --from=builder /app/web/public /app/web-standalone/public

# Copy backend (already in base)
# Create start script to run both backend and frontend
COPY <<'EOF' /app/start.sh
#!/usr/bin/env bash
set -e

# Start FastAPI (Analyzer) on 8000
echo "Starting Gatespy Analyzer (FastAPI) on :8000"
python3 -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 &

# Start Next.js standalone server on PORT (Render provides PORT)
echo "Starting Gatespy Web (Next.js) on :${PORT:-3000}"
cd /app/web-standalone
node server.js -p ${PORT:-3000}
EOF

RUN chmod +x /app/start.sh

# Expose Next.js port
EXPOSE 3000

CMD ["/app/start.sh"]