#!/bin/bash
# SSL Certificate Setup with Let's Encrypt and Traefik
# Automatically obtains and renews SSL certificates

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"; exit 1; }

[[ $EUID -ne 0 ]] && error "This script must be run as root"

DOMAIN="${1:-family-planner.local}"
EMAIL="${2:-admin@example.com}"
LETSENCRYPT_DIR="/opt/family-planner/letsencrypt"

log "Setting up Let's Encrypt SSL for domain: $DOMAIN"

mkdir -p "$LETSENCRYPT_DIR"
chmod 755 "$LETSENCRYPT_DIR"

# Create acme.json for Traefik
if [ ! -f "$LETSENCRYPT_DIR/acme.json" ]; then
    log "Creating acme.json for Traefik..."
    touch "$LETSENCRYPT_DIR/acme.json"
    chmod 600 "$LETSENCRYPT_DIR/acme.json"
fi

# Backup existing certs
if [ -d "$LETSENCRYPT_DIR/live" ]; then
    log "Backing up existing certificates..."
    tar -czf "$LETSENCRYPT_DIR/certs-backup-$(date +%s).tar.gz" "$LETSENCRYPT_DIR/live"
fi

# Create renewal hook script
cat > /opt/family-planner/scripts/renew-certs.sh <<'RENEWSCRIPT'
#!/bin/bash

DOMAIN=${1:-family-planner.local}
EMAIL=${2:-admin@example.com}
LETSENCRYPT_DIR="/opt/family-planner/letsencrypt"

echo "Renewing SSL certificates for $DOMAIN..."

# Traefik handles renewal automatically via ACME
# This script runs manually if needed
docker exec traefik traefik-cli renew || true

echo "Certificate renewal process initiated"
RENEWSCRIPT

chmod +x /opt/family-planner/scripts/renew-certs.sh

# Create systemd timer for automatic renewal
cat > /etc/systemd/system/renew-certs.timer <<'TIMERFILE'
[Unit]
Description=Renew SSL Certificates Daily
Requires=renew-certs.service

[Timer]
OnBootSec=5min
OnUnitActiveSec=24h
Persistent=true

[Install]
WantedBy=timers.target
TIMERFILE

cat > /etc/systemd/system/renew-certs.service <<'SERVICEFILE'
[Unit]
Description=Renew SSL Certificates
After=docker.service

[Service]
Type=oneshot
ExecStart=/opt/family-planner/scripts/renew-certs.sh %DOMAIN% %EMAIL%
StandardOutput=journal
StandardError=journal
SERVICEFILE

systemctl daemon-reload
systemctl enable renew-certs.timer
systemctl start renew-certs.timer

log "SSL certificate setup complete!"
log "Domain: $DOMAIN"
log "Email: $EMAIL"
log "ACME file: $LETSENCRYPT_DIR/acme.json"
log "Auto-renewal timer: Enabled (daily at same time)"
log ""
log "Traefik will automatically:"
log "  1. Obtain certificates from Let's Encrypt"
log "  2. Renew before expiration (30 days)"
log "  3. Store certs in $LETSENCRYPT_DIR/acme.json"
