# Family Planner — Deployment Guide

## Architecture Overview

The deployment is split into **two independent Docker targets**:

```
┌──────────────────────────────────────────────────────────┐
│  CLIENT MACHINE                                          │
│                                                          │
│  deploy/frontend/       ← Client installs this ONLY      │
│  ┌──────────────────┐                                    │
│  │  nginx:alpine    │  → API_URL=https://api.host ──┐   │
│  │  (static bundle) │                                │   │
│  └──────────────────┘                                │   │
└───────────────────────────────────────────────────────│──┘
                                                        │
                         ┌──────────────────────────────▼──┐
                         │  YOUR SERVER  (central or       │
                         │  self-hosted by client)          │
                         │                                  │
                         │  deploy/backend/                 │
                         │  ┌──────────┐  ┌─────────────┐  │
                         │  │ Traefik  │→ │ fp-api (×N) │  │
                         │  │ LB + TLS │  │ Node.js/TS  │  │
                         │  └──────────┘  └─────────────┘  │
                         │                ┌─────────────┐  │
                         │                │ PostgreSQL   │  │
                         │                └─────────────┘  │
                         │                ┌─────────────┐  │
                         │                │ Ollama LLM  │  │
                         │                │ (opt-in)    │  │
                         │                └─────────────┘  │
                         └─────────────────────────────────┘
```

---

## 1. Frontend Install (Client)

Clients only need `deploy/frontend/`. It is a **pure static nginx container** — no Node.js at runtime.

```bash
cd deploy/frontend
cp .env.example .env
# Edit .env: set API_URL=https://api.your-backend.com
docker compose up -d
```

The JS bundle is compiled with `API_URL` baked in. **Rebuild is required when `API_URL` changes** (~60s build).

```bash
docker compose build --no-cache && docker compose up -d
```

---

## 2. Backend Deploy

### Option A — Single node (docker compose)

Good for initial launch, home servers, small teams.

```bash
cd deploy/backend
cp .env.example .env
# Fill in POSTGRES_PASSWORD, JWT_SECRET, CORS_ORIGINS, ACME_EMAIL

docker compose up -d

# Scale API on single node
docker compose up -d --scale fp-api=3
```

### Option B — Multi-node Docker Swarm (recommended for production)

Provides rolling zero-downtime deploys, auto-restart, and horizontal scaling across machines.

```bash
cd deploy/backend
cp .env.example .env

# 1. Initialize Swarm and deploy
chmod +x swarm-scale.sh
./swarm-scale.sh init

# 2. Check services
./swarm-scale.sh status

# 3. Scale API replicas up
./swarm-scale.sh scale 4

# 4. Rolling redeploy (zero downtime) after image update
./swarm-scale.sh deploy
```

#### Adding worker nodes

```bash
# On the manager:
docker swarm join-token worker
# → Copy the output command and run it on each worker machine.
# API replicas distribute automatically across all workers.
```

---

## 3. LLM / AI Features (Optional)

The Ollama LLM service is **opt-in** to keep the base install lean.

```bash
# Start with LLM
docker compose --profile llm up -d

# Pull a model (first time)
docker exec $(docker ps -q -f name=fp_fp-llm) ollama pull llama3

# Verify
curl http://localhost:11434/api/tags
```

The API connects to the LLM at `LLM_API_URL` (defaults to the internal `fp-llm` service).

---

## 4. Local Development (Full Stack)

```bash
cd deploy/full-stack
cp .env.example .env
docker compose up -d

# App:    http://localhost:3000
# API:    http://localhost:4000/api/health
# DB:     localhost:5432  (fp_user / dev_password_change_me)
```

---

## 5. Secret Generation

```bash
# POSTGRES_PASSWORD
node -e "process.stdout.write(require('crypto').randomBytes(24).toString('base64url'))"

# JWT_SECRET (min 32 chars)
node -e "process.stdout.write(require('crypto').randomBytes(48).toString('base64url'))"

# KROGER_TOKEN_ENCRYPTION_KEY (64-char hex)
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 6. Go-to-Market Packaging Summary

| What | Who deploys | Files |
|---|---|---|
| Frontend app | **Client** | `deploy/frontend/` |
| API + DB | **You** (SaaS) or client (self-hosted) | `deploy/backend/` |
| LLM / AI features | **You** (GPU server, opt-in) | `deploy/backend/` + `--profile llm` |
| Local dev | Developer | `deploy/full-stack/` |

**SaaS model:** You host the backend centrally; clients install `deploy/frontend/` only and set `API_URL` to your server.

**Self-hosted model:** Client deploys both `frontend` and `backend`. Backend Swarm setup scales horizontally as the household grows.
