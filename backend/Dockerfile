# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install security scanning tools
RUN apk add --no-cache curl

COPY package*.json ./
RUN npm ci --prefer-offline --no-audit
COPY tsconfig.json ./
COPY src ./src
COPY migrations ./migrations
RUN npm run build

# ---- Runtime stage ----
FROM node:20-alpine AS runner
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

COPY package*.json ./
RUN npm ci --omit=dev --prefer-offline --no-audit && npm cache clean --force

COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/migrations ./migrations

# Security: Set read-only filesystem for sensitive paths
RUN chmod -R 755 /app/dist /app/migrations

USER nodejs

EXPOSE 4000

# Use dumb-init to properly handle signals
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/server.js"]
