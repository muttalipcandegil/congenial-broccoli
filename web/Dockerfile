# Frontend Dockerfile for Gatespy (Render-friendly)
FROM node:18-alpine AS deps
WORKDIR /app
COPY web/package.json web/package-lock.json* web/pnpm-lock.yaml* web/yarn.lock* ./ 
RUN npm ci || npm install

FROM node:18-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY web ./
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public || true

# Render provides PORT
EXPOSE 3000
CMD ["sh", "-c", "node server.js -p ${PORT:-3000}"]