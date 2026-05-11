# 🍽️ Family Planner

A full-stack family meal planning app — generate a weekly dinner plan, track what's in your pantry, build a shopping list, and optionally push missing items straight into a Kroger grocery cart.

---

## ✨ Features

| Feature | Details |
|---|---|
| **Weekly Meal Planner** | Auto-generates a 7-day plan from your recipe library |
| **Recipe Browser** | Search by keyword or filter by tag (Quick, Vegetarian, etc.) |
| **Pantry Tracker** | Add/edit/delete items; quantities carry over to shopping |
| **Smart Shopping List** | Only shows ingredients you're actually missing |
| **Kroger Integration** | One-click cart creation via Kroger API (optional) |
| **Auth** | Keycloak OAuth 2.0 / OIDC with Parent/Child RBAC roles |

---

## 🏗️ Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│  React/Vite  │────▶│  Node/Express    │────▶│ PostgreSQL  │
│  Port 3000   │     │  Port 4000       │     │  Port 5432  │
│  Tailwind    │     │  TypeScript      │     │             │
└──────────────┘     └──────────────────┘     └─────────────┘
                              │
                              ▼
                     ┌─────────────────┐
                     │   Kroger API    │
                     │  (optional)     │
                     └─────────────────┘
```

All three services run in Docker and are wired together via Docker Compose.

---

## 🚀 Quick Start

**Prerequisites:** Docker Desktop (or Docker + Docker Compose)

```bash
# 1. Clone the repo
git clone https://github.com/slagout/family-planner.git
cd family-planner

# 2. Configure environment
cp .env.example .env
# Open .env and set at minimum:
#   POSTGRES_PASSWORD=your_db_password
#   JWT_SECRET=a_long_random_string

# 3. Start the app (builds images, runs migrations, seeds recipes)
chmod +x start-family-planner.sh
./start-family-planner.sh
```

Open **http://localhost:3000** and register an account.

Press **Ctrl+C** to stop all services gracefully.

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env` and fill in:

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_DB` | Yes | Database name (default: `family_planner`) |
| `POSTGRES_USER` | Yes | DB username (default: `fp_user`) |
| `POSTGRES_PASSWORD` | **Yes** | DB password — change this! |
| `JWT_SECRET` | **Yes** | Secret for signing JWTs — use a long random string |
| `KROGER_CLIENT_ID` | No | Kroger Developer API client ID |
| `KROGER_CLIENT_SECRET` | No | Kroger Developer API client secret |
| `KROGER_REDIRECT_URI` | No | OAuth redirect URI (default: `http://localhost:4000/api/kroger/callback`) |

> Kroger variables are optional. If omitted, cart creation returns a graceful message rather than an error.

---

## 📡 API Reference

Base URL: `http://localhost:4000/api`

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/auth/me` | ✅ | Current user profile (synced from Keycloak) |

### Recipes
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/recipes` | — | Paginated list; supports `?search=`, `?tag=`, `?page=`, `?limit=` |
| `GET` | `/recipes/:id` | — | Recipe detail with full ingredient list |
| `POST` | `/recipes` | ✅ | Create recipe with ingredients |

### Pantry
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/pantry` | ✅ | All pantry items for current user |
| `POST` | `/pantry` | ✅ | Add item (additive upsert on duplicate name+unit) |
| `PUT` | `/pantry/:id` | ✅ | Update quantity/unit |
| `DELETE` | `/pantry/:id` | ✅ | Remove item |

### Menu Planner
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/menu/plan` | ✅ | Generate weekly plan; `{ createCart?: boolean }` |
| `GET` | `/menu/current` | ✅ | Fetch this week's plan |
| `DELETE` | `/menu/:id` | ✅ | Delete a plan |

### System
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | — | `{ status: "ok" }` |

---

## 🗄️ Database Schema

```
users               recipes              recipe_ingredients
────────────        ─────────────        ──────────────────
id (UUID)           id (serial)          id (serial)
email               name                 recipe_id → recipes
password_hash       description          name
display_name        servings             quantity
kroger_token        prep_minutes         unit
created_at          cook_minutes         kroger_upc
                    tags (array)
                    created_by → users

pantry_items        weekly_menu          menu_item
────────────        ───────────          ─────────
id (serial)         id (serial)          id (serial)
user_id → users     user_id → users      weekly_menu_id
name                week_number          recipe_id → recipes
quantity            year                 day_of_week
unit                created_at           (Mon–Sun)
updated_at
UNIQUE(user_id, name, unit)
UNIQUE(user_id, week_number, year)
```

Migrations run automatically on startup. Re-running is safe (idempotent).

---

## 🛒 Kroger Integration

1. Register at [developer.kroger.com](https://developer.kroger.com) and create an app
2. Add `KROGER_CLIENT_ID` and `KROGER_CLIENT_SECRET` to your `.env`
3. On the Weekly Planner, use **"Generate + Kroger Cart"** button
4. The app uses OAuth2 Client Credentials to create a cart pre-loaded with missing ingredients

Items with a `kroger_upc` match directly. Others are looked up by name via Kroger's product search API. Unmatched items are reported back but don't block the cart creation.

---

## 🧱 Project Structure

```
family-planner/
├── backend/
│   ├── src/
│   │   ├── handlers/       # Route handlers (auth, recipes, pantry, menu)
│   │   ├── middleware/      # JWT auth, error handler, rate limiter
│   │   ├── routes/          # Express routers
│   │   ├── services/        # Kroger API service
│   │   ├── types/           # Shared TypeScript types
│   │   ├── db.ts            # PostgreSQL pool
│   │   └── server.ts        # App entry point
│   └── migrations/          # SQL migration files (auto-run on start)
├── frontend/
│   └── src/
│       ├── components/      # React UI components
│       ├── context/         # AuthContext (JWT state)
│       ├── hooks/           # useAuth, useMenuPlan
│       ├── api/             # Axios client with interceptors
│       └── types/           # Shared TypeScript types
├── docker-compose.yml                 # Development stack
├── docker-compose.prod.yml            # Production stack (HA, monitoring, logging)
├── .env.example                       # Development env template
├── .env.prod.example                  # Production env template
├── PRODUCTION.md                      # Production deployment overview
├── QUICKSTART.md                      # 30-minute quick start guide
├── INFRASTRUCTURE.md                  # Complete operations guide
├── DEPLOYMENT.md                      # Detailed procedures & checklists
├── DEPLOYMENT-SUMMARY.md              # Summary of all created files
├── ubuntu-setup.sh                    # Production system setup
├── network-config.sh                  # Network & firewall configuration
├── ssl-setup.sh                       # TLS/Let's Encrypt setup
├── health-check.sh                    # Service health verification
├── prometheus.yml                     # Prometheus metrics config
├── alert-rules.yml                    # Prometheus alert rules
├── traefik.yml                        # Traefik core config
├── traefik-dynamic.yml                # Traefik routing rules
├── grafana-config.yml                 # Grafana configuration
├── ci-cd.yml                          # GitHub Actions pipeline
└── start-family-planner.sh            # Local development startup
```

---

## 🚀 Production Deployment

Family Planner is production-ready! See **[PRODUCTION.md](./PRODUCTION.md)** for:
- Complete production architecture
- 30-minute quick start deployment
- PostgreSQL immutable schema
- Monitoring with Prometheus + Grafana
- Centralized logging with Graylog
- Automated backups
- Blue-green deployment
- Alert rules and dashboards

**Quick Links**:
- **[QUICKSTART.md](./QUICKSTART.md)** - 30 minutes to production
- **[INFRASTRUCTURE.md](./INFRASTRUCTURE.md)** - Operations guide (17,000+ words)
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Procedures & checklists
- **[DEPLOYMENT-SUMMARY.md](./DEPLOYMENT-SUMMARY.md)** - What was created

---

## 🧑‍💻 Local Development (without Docker)

```bash
# Start just the database
docker compose up db -d

# Backend
cd backend
npm install
cp ../.env.example ../.env   # configure .env
npm run dev                  # ts-node with nodemon, port 4000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                  # Vite dev server, port 3000
```

The Vite dev server proxies `/api` requests to `http://localhost:4000` automatically.

