#!/bin/bash
# Network Configuration for Family Planner Production
# Static IP setup and firewall rules for XCP-NG Ubuntu VM

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"; exit 1; }

[[ $EUID -ne 0 ]] && error "This script must be run as root"

INTERFACE="${1:- eth0}"
IP_ADDRESS="${2:-192.168.1.100}"
GATEWAY="${3:-192.168.1.1}"
NETMASK="${4:-255.255.255.0}"
DNS1="${5:-8.8.8.8}"
DNS2="${6:-8.8.4.4}"

log "Configuring static IP for $INTERFACE"
log "  IP: $IP_ADDRESS"
log "  Gateway: $GATEWAY"
log "  Netmask: $NETMASK"

# Backup original config
cp /etc/netplan/01-netcfg.yaml /etc/netplan/01-netcfg.yaml.bak

# Create netplan configuration
cat > /etc/netplan/01-netcfg.yaml <<EOF
network:
  version: 2
  renderer: networkd
  ethernets:
    $INTERFACE:
      dhcp4: no
      addresses:
        - address: $IP_ADDRESS/24
      gateway4: $GATEWAY
      nameservers:
        addresses: [$DNS1, $DNS2]
EOF

log "Applying network configuration..."
netplan apply

log "Verifying network..."
ip addr show $INTERFACE
ip route show

# Configure UFW firewall rules
log "Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing

# SSH
ufw allow 22/tcp comment "SSH"

# HTTP/HTTPS
ufw allow 80/tcp comment "HTTP"
ufw allow 443/tcp comment "HTTPS"

# Docker internal (restrict to local network)
ufw allow from 172.25.0.0/16 comment "Docker internal network"

# Traefik dashboard (restrict to local)
ufw allow from $GATEWAY to any port 8080 comment "Traefik dashboard"

# Prometheus/Grafana/Graylog (restrict to local)
ufw allow from $GATEWAY to any port 9090 comment "Prometheus"
ufw allow from $GATEWAY to any port 3000 comment "Grafana"
ufw allow from $GATEWAY to any port 9000 comment "Graylog"

# Enable firewall
ufw --force enable

log "Firewall rules configured:"
ufw status numbered

log "Network configuration complete!"
log "Static IP: $IP_ADDRESS"
log "Firewall: Enabled"
