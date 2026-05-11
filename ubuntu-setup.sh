#!/bin/bash
# Family Planner Production Setup Script
# For Ubuntu 22.04 LTS on XCP-NG VM

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"; exit 1; }

[[ $EUID -ne 0 ]] && error "This script must be run as root (use: sudo)"

log "Starting Family Planner production environment setup..."

log "Updating system packages..."
apt-get update && apt-get upgrade -y

log "Installing system dependencies..."
apt-get install -y ca-certificates curl gnupg lsb-release wget git ufw htop net-tools vim nano jq openssl

log "Installing Docker..."
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

log "Installing Docker Compose standalone..."
DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d'"' -f4)
curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

log "Starting Docker service..."
systemctl start docker && systemctl enable docker

log "Configuring Docker group..."
groupadd -f docker
usermod -aG docker $SUDO_USER 2>/dev/null || true

log "Configuring system limits..."
cat >> /etc/security/limits.conf <<EOF

*       soft    nofile  65536
*       hard    nofile  65536
*       soft    nproc   32768
*       hard    nproc   32768
EOF

log "Optimizing kernel parameters..."
cat >> /etc/sysctl.conf <<EOF

vm.max_map_count=262144
net.core.somaxconn=32768
net.ipv4.tcp_max_syn_backlog=32768
net.ipv4.ip_local_port_range=1024 65535
net.netfilter.nf_conntrack_max=2000000
net.netfilter.nf_conntrack_tcp_timeout_established=600
EOF

sysctl -p > /dev/null

log "Creating project directories..."
mkdir -p /opt/family-planner/{config,letsencrypt,scripts,backups}
mkdir -p /opt/family-planner/config/{traefik,grafana/provisioning,prometheus}
chmod 750 /opt/family-planner

if [ ! -f /opt/family-planner/.env.prod ]; then
    log "Creating .env.prod template..."
    cat > /opt/family-planner/.env.prod <<'ENVFILE'
ENVIRONMENT=production
DOMAIN=family-planner.local
POSTGRES_DB=family_planner
POSTGRES_USER=fp_user
POSTGRES_PASSWORD=
REDIS_PASSWORD=
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=
LETSENCRYPT_EMAIL=admin@example.com
LOG_LEVEL=info
ENVFILE
    
    chmod 600 /opt/family-planner/.env.prod
    warn "IMPORTANT: Update DOMAIN and secrets in /opt/family-planner/.env.prod"
fi

log "Creating systemd service..."
cat > /etc/systemd/system/family-planner.service <<'SERVICEFILE'
[Unit]
Description=Family Planner Production Stack
After=docker.service
Requires=docker.service

[Service]
Type=simple
WorkingDirectory=/opt/family-planner
ExecStart=/usr/bin/docker compose -f docker-compose.prod.yml up
ExecStop=/usr/bin/docker compose -f docker-compose.prod.yml down
Restart=on-failure
RestartSec=10s
StandardOutput=journal
StandardError=journal
User=root

[Install]
WantedBy=multi-user.target
SERVICEFILE

systemctl daemon-reload

if command -v ufw &> /dev/null; then
    log "Configuring firewall..."
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    ufw --force enable
fi

log "Verifying installation..."
docker --version && docker compose version

log "${GREEN}✓ Setup complete! Configure /opt/family-planner/.env.prod and run: sudo systemctl start family-planner${NC}"
