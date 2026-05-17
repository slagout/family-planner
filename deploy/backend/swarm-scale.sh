#!/usr/bin/env bash
# =============================================================================
# Family Planner Backend — Docker Swarm Init & Scale Helper
# =============================================================================
# Usage:
#   ./swarm-scale.sh init       Initialize Swarm and deploy the full stack
#   ./swarm-scale.sh deploy     (Re-)deploy / rolling update the stack
#   ./swarm-scale.sh scale N    Scale the API to N replicas
#   ./swarm-scale.sh status     Show service health and replica counts
#   ./swarm-scale.sh logs       Tail live API logs
#   ./swarm-scale.sh down       Remove the stack (keeps volumes)
# =============================================================================
set -euo pipefail

STACK_NAME="fp"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="$SCRIPT_DIR/docker-compose.yml"

banner() { echo -e "\e[1;36m=== $* ===\e[0m"; }
die()    { echo -e "\e[1;31mERROR: $*\e[0m" >&2; exit 1; }

# Load .env from same directory if present
if [[ -f "$SCRIPT_DIR/.env" ]]; then
  set -a; source "$SCRIPT_DIR/.env"; set +a
  echo "[env] Loaded $SCRIPT_DIR/.env"
fi

require_env() {
  local var=$1
  [[ -z "${!var:-}" ]] && die "$var must be set. Copy .env.example → .env and fill it in."
}

case "${1:-help}" in

  init)
    banner "Initialising Docker Swarm"
    if ! docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null | grep -q active; then
      docker swarm init
      echo "✅ Swarm initialised. This node is now the manager."
      echo "   To add workers:  docker swarm join-token worker"
    else
      echo "ℹ️  Already in Swarm mode."
    fi
    echo ""
    ;& # fall-through to deploy

  deploy)
    banner "Deploying stack: $STACK_NAME"
    require_env POSTGRES_PASSWORD
    require_env JWT_SECRET
    docker stack deploy \
      --compose-file "$COMPOSE_FILE" \
      --with-registry-auth \
      --prune \
      "$STACK_NAME"
    echo ""
    echo "✅ Stack deployed. Services starting up..."
    echo "   Monitor: $0 status"
    echo "   Scale:   $0 scale 4"
    ;;

  scale)
    REPLICAS=${2:-2}
    banner "Scaling fp-api to $REPLICAS replica(s)"
    docker service scale "${STACK_NAME}_fp-api=${REPLICAS}"
    echo "✅ Scaling in progress — watch: docker service ps ${STACK_NAME}_fp-api"
    ;;

  status)
    banner "Stack: $STACK_NAME"
    docker stack services "$STACK_NAME" 2>/dev/null || echo "(stack not running)"
    echo ""
    docker stack ps "$STACK_NAME" --no-trunc 2>/dev/null || true
    ;;

  logs)
    SERVICE=${2:-fp-api}
    docker service logs -f --tail 100 "${STACK_NAME}_${SERVICE}"
    ;;

  down)
    banner "Removing stack: $STACK_NAME"
    docker stack rm "$STACK_NAME"
    echo ""
    echo "ℹ️  Data volumes are preserved. To remove them:"
    echo "   docker volume rm fp_pgdata fp_traefik-certs fp_llm-models"
    ;;

  help|*)
    echo ""
    echo "Usage: $0 {init|deploy|scale N|status|logs [service]|down}"
    echo ""
    echo "  init          Init Swarm + deploy stack"
    echo "  deploy        Rolling redeploy (zero-downtime)"
    echo "  scale N       Scale API to N replicas"
    echo "  status        Show all services and tasks"
    echo "  logs [svc]    Tail logs (default: fp-api)"
    echo "  down          Remove stack (volumes preserved)"
    echo ""
    ;;
esac
