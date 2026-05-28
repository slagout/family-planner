# Family Planner — Deployment Guide

## Architecture Overview

Three independent Docker targets — deploy only what you need:

```
┌──────────────────────────────────────────────────────────────────┐
│  CLIENT MACHINE                                                  │
│                                                                  │
│  deploy/frontend/       ← Client installs THIS ONLY              │
│  ┌──────────────────┐                                            │
│  │  nginx:alpine    │  → API_URL=https://api.host ─────────┐    │
│  │  (static bundle) │    (set in .env, no rebuild needed)   │    │
│  └──────────────────┘                                       │    │
└─────────────────────────────────────────────────────────────│────┘
                                                              │
                    ┌─────────────────────────────────────────▼────┐
                    │  API SERVER  (your SaaS or client self-host) │
                    │                                              │
                    │  deploy/backend/                            │
                    │  ┌──────────┐  ┌─────────────────────────┐  │
                    │  │ Traefik  │→ │ fp-api (×N replicas)    │  │
                    │  │ LB + TLS │  │ Node.js/TypeScript       │  │
                    │  └──────────┘  └─────────────────────────┘  │
                    │                ┌─────────────────────────┐  │
                    │                │ PostgreSQL               │  │
                    │                └─────────────────────────┘  │
                    └─────────────────────────────────────────────┘
                                           │ LLM_API_URL
                    ┌──────────────────────▼──────────────────────┐
                    │  LLM SERVER  (GPU machine, optional)        │
                    │                                              │
                    │  deploy/llm/                                │
                    │  ┌─────────────────────────────────────┐    │
                    │  │ Ollama (llama3, mistral, phi3 ...)  │    │
                    │  └─────────────────────────────────────┘    │
                    └─────────────────────────────────────────────┘
```

| What | Who deploys | Directory | Scale |
|---|---|---|---|
| Frontend (SPA) | **Client** | `deploy/frontend/` | Static nginx |
| API + Database | **You** (SaaS) or client | `deploy/backend/` | Docker Swarm N replicas |
| LLM / AI | **You** (GPU server) | `deploy/llm/` | Single Ollama instance |
| Local dev | Developer | `deploy/full-stack/` | All-in-one |

---

## 1. Frontend Install (Client)

Clients only need `deploy/frontend/`. It is a **pure static nginx container** with no Node.js at runtime.

```bash
cd deploy/frontend
cp .env.example .env
# Edit .env: set API_URL=https://api.your-backend.com
docker compose up -d
```

**API_URL is runtime-configurable** — no rebuild needed when the backend changes.
Just update `.env` and restart the container:

```bash
# Change API_URL in .env, then:
docker compose up -d
```

To rebuild the image (e.g., after a frontend code update):
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
# On the manager node:
docker swarm join-token worker
# Copy the output command and run it on each worker machine.
# API replicas distribute automatically across all workers.
```

---

## 3. LLM / AI Service (Standalone)

Run Ollama on a **separate machine** (GPU recommended) and point the backend at it.

```bash
cd deploy/llm
cp .env.example .env
# Optionally set DEFAULT_MODEL and ALLOWED_ORIGINS

docker compose up -d

# Pull your chosen model (first time only)
docker compose run --rm model-init

# Verify
curl http://localhost:11434/api/tags
```

Then in your backend `.env` set:
```
LLM_API_URL=http://<llm-host-ip>:11434
```

> **GPU Acceleration (NVIDIA):** Edit `deploy/llm/docker-compose.yml` and uncomment
> the `deploy.resources.reservations` block. Requires `nvidia-container-toolkit` on the host.

**Included models** (set `DEFAULT_MODEL` in .env):

| Model | RAM needed | Best for |
|---|---|---|
| `llama3:8b` | ~8 GB | General tasks, runs on CPU |
| `mistral:7b` | ~7 GB | Fast + high quality |
| `phi3:mini` | ~4 GB | Limited hardware |
| `llama3:70b` | ~48 GB | Best quality, GPU required |

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

## 6. Go-to-Market Summary

**SaaS model:** You host the backend + LLM centrally. Clients install `deploy/frontend/` only and set `API_URL` to your server. One-line change in `.env`, no Docker rebuild required.

**Self-hosted model:** Client deploys `frontend/` + `backend/`. The Swarm setup scales horizontally as the household grows. LLM is optional and can be hosted separately on a GPU machine.
