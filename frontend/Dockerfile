# ─── Stage 1: install dependencies ───────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci && \
    npm install \
      @rollup/rollup-linux-x64-musl \
      lightningcss-linux-x64-musl \
      @tailwindcss/oxide-linux-x64-musl \
      --no-save 2>/dev/null || true

# ─── Stage 2: build Vite app ──────────────────────────────────────────────────
FROM deps AS builder

COPY . .

ARG VITE_API_URL
RUN npm run build

# ─── Stage 3: Nginx runtime ───────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runtime

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
