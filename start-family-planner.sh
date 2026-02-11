#!/usr/bin/env bash
#
# start-family-planner.sh
# --------------------------------------------------------------
# Purpose:
#   • Bring up the Docker-Compose stack defined in ./docker-compose.yml
#   • Run any required one-off init steps (e.g. DB migrations)
#   • Stream logs so you can see what's happening
#   • Exit cleanly on Ctrl-C, stopping the containers gracefully
#
# How to use:
#   1. Make the script executable: chmod +x start-family-planner.sh
#   2. From VS Code run the task "Start Family Planner" (see tasks.json)
#   3. Or run it manually: ./start-family-planner.sh
#
# --------------------------------------------------------------

set -euo pipefail   # fail fast on errors, unset vars, and pipe failures

# ------------------------------------------------------------------
# Graceful shutdown when the user hits Ctrl-C
# ------------------------------------------------------------------
trap 'echo ""; banner "Shutting down stack…"; docker compose down' SIGINT SIGTERM

# ------------------------------------------------------------------
# Helper: print a coloured banner
# ------------------------------------------------------------------
banner() {
  local msg="$1"
  echo -e "\e[1;34m=== $msg ===\e[0m"
}

# ------------------------------------------------------------------
# 1. Ensure Docker & Docker-Compose are available
# ------------------------------------------------------------------
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker is not installed. Install it first."
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "❌ Docker Compose (v2 plugin) is not available."
  exit 1
fi

# ------------------------------------------------------------------
# 2. Pull latest images (helps when you change the Dockerfiles)
# ------------------------------------------------------------------
banner "Pulling latest images (if any)"
docker compose pull

# ------------------------------------------------------------------
# 3. Build any images that need rebuilding (e.g. backend, llm-service)
# ------------------------------------------------------------------
banner "Building local images"
docker compose build

# ------------------------------------------------------------------
# 4. Start the stack in detached mode
# ------------------------------------------------------------------
banner "Starting the stack (detached)…"
docker compose up -d

# ------------------------------------------------------------------
# 5. Wait for key services to become healthy
# ------------------------------------------------------------------
wait_for_service() {
  local name=$1
  local url=$2
  local retries=30
  local wait_sec=2

  banner "Waiting for $name to be ready…"
  for ((i=1;i<=retries;i++)); do
    if curl -sSf "$url" >/dev/null 2>&1; then
      echo "✅ $name is up!"
      return 0
    fi
    echo "⏳ $name not ready yet ($i/$retries)…"
    sleep $wait_sec
  done
  echo "⚠️ $name did not become ready after $((retries*wait_sec)) seconds."
  return 1
}

# Example health-check endpoints (adjust ports if you change them)
wait_for_service "Nginx (HTTPS)"   "https://localhost/health" || true
wait_for_service "Backend (REST)"  "https://localhost/api/health" || true
wait_for_service "LLM Service"    "http://localhost:8001/health" || true

# ------------------------------------------------------------------
# 6. Optional: run DB migrations / seed data (once)
# ------------------------------------------------------------------
# Uncomment and adapt if you add migration scripts later.
# banner "Running DB migrations (if any)"
# docker compose exec backend cargo run --bin migrate || true

# ------------------------------------------------------------------
# 7. Tail logs (Ctrl-C to stop)
# ------------------------------------------------------------------
banner "Streaming logs – press Ctrl-C to stop and shut down the stack"
docker compose logs -f &
LOGS_PID=$!

# Keep the script alive until the user aborts (the trap handles cleanup)
wait $LOGS_PID
