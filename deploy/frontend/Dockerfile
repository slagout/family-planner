# =============================================================================
# Family Planner — Frontend (Client Install)
# =============================================================================
# This image is what clients install. It is a pure static nginx container.
# The only required configuration is VITE_API_URL — set it to wherever the
# backend API is hosted (centrally by you, or self-deployed by the client).
#
# Build:
#   docker build \
#     --build-arg VITE_API_URL=https://api.example.com \
#     -t family-planner-frontend .
#
# Run:
#   docker run -p 80:80 family-planner-frontend
# =============================================================================

# ---- Stage 1: Build React app ------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Accept the API base URL at build time (baked into the JS bundle)
ARG VITE_API_URL=http://localhost:4000
ENV VITE_API_URL=$VITE_API_URL

COPY frontend/package*.json ./
RUN npm ci --prefer-offline

COPY frontend/ .
RUN npm run build

# ---- Stage 2: Serve with nginx -----------------------------------------------
FROM nginx:1.25-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY deploy/frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Health check for Docker / Swarm
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
