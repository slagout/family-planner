# =============================================================================
# Family Planner — Frontend (Client Install)
# =============================================================================
# Pure static nginx container. API_URL is configured at RUNTIME via env var
# — no image rebuild needed when pointing at a different backend server.
#
# Build (from repo root):
#   docker build -f deploy/frontend/Dockerfile -t family-planner-frontend .
#
# Run with runtime API URL:
#   docker run -p 80:80 -e API_URL=https://api.your-domain.com family-planner-frontend
#
# Via docker compose (recommended):
#   cd deploy/frontend && cp .env.example .env
#   # Edit .env: set API_URL=https://your-backend.com
#   docker compose up -d
# =============================================================================

# ---- Stage 1: Build React app ------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# React SPA uses baseURL='/api'; nginx proxies /api/ to $API_URL at runtime.
# No build-time URL baking — fully runtime-configurable via env var.
COPY frontend/package*.json ./
RUN npm ci --prefer-offline

COPY frontend/ .
RUN npm run build

# ---- Stage 2: Serve with nginx (runtime-configurable) -----------------------
FROM nginx:1.25-alpine AS runner

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Static assets from Vite build
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx template — ${API_URL} is substituted by entrypoint at container start
COPY deploy/frontend/nginx.conf /etc/nginx/templates/default.conf.template

# Entrypoint injects API_URL before nginx starts
COPY deploy/frontend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Default: override with -e API_URL=https://... or in .env
ENV API_URL=http://localhost:4000

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
