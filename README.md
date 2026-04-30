# Family Planner

A full-stack family meal planning app with weekly menu generation, pantry tracking, and optional Kroger cart integration.

## Stack
- **Frontend**: React + Vite + TypeScript + Tailwind CSS (port 3000)
- **Backend**: Node.js + Express + TypeScript (port 4000)
- **Database**: PostgreSQL 16 (port 5432)
- **Orchestration**: Docker Compose

## Quick Start

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD and JWT_SECRET at minimum

# 2. Start everything
chmod +x start-family-planner.sh
./start-family-planner.sh
```

Open http://localhost:3000 in your browser.

## Features
- Weekly meal plan generator (7 random recipes)
- Recipe browser with search and tag filtering
- Pantry inventory management
- Shopping list from missing ingredients
- Optional Kroger cart creation for missing ingredients

## API
Base URL: `http://localhost:4000/api`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register | No | Create account |
| POST | /auth/login | No | Get JWT |
| GET | /auth/me | Yes | Current user |
| GET | /recipes | No | List recipes (paginated) |
| GET | /recipes/:id | No | Recipe detail |
| POST | /recipes | Yes | Create recipe |
| GET | /pantry | Yes | List pantry items |
| POST | /pantry | Yes | Add/update pantry item |
| PUT | /pantry/:id | Yes | Update pantry item |
| DELETE | /pantry/:id | Yes | Delete pantry item |
| POST | /menu/plan | Yes | Generate weekly plan |
| GET | /menu/current | Yes | Get current week's plan |
| DELETE | /menu/:id | Yes | Delete a plan |
| GET | /health | No | Health check |

## Kroger Integration
Set `KROGER_CLIENT_ID` and `KROGER_CLIENT_SECRET` in `.env` to enable cart creation.
