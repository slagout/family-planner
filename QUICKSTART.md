# Family Planner - Quick Start Production Deployment

## Overview

This document provides a quick reference for deploying Family Planner to production on a single Ubuntu 22.04 VM on XCP-NG.

## Files Created

### Core Deployment Files

| File | Purpose |
|------|---------|
| `docker-compose.prod.yml` | Production stack definition with all services |
| `.env.prod.example` | Environment variables template (copy to `.env.prod`) |
| `ubuntu-setup.sh` | Initial system setup and Docker installation |
| `network-config.sh` | Static IP and firewall configuration |
| `ssl-setup.sh` | Let's Encrypt TLS certificate automation |
| `health-check.sh` | Service health verification script |

### Configuration Files

| File | Purpose |
|------|---------|
| `traefik.yml` | Traefik reverse proxy configuration |
| `traefik-dynamic.yml` | Traefik routing rules and middleware |
| `prometheus.yml` | Prometheus metrics scrape configuration |
| `alert-rules.yml` | Alert rules for Prometheus |
| `grafana-config.yml` | Grafana datasource and dashboard config |

### Documentation

| File | Purpose |
|------|---------|
| `INFRASTRUCTURE.md` | Complete infrastructure guide (17,000+ words) |
| `DEPLOYMENT.md` | Deployment procedures and checklocks |
| `QUICKSTART.md` | This file - quick reference guide |

## Quick Start (30 Minutes)

### Step 1: SSH into New Ubuntu 22.04 VM

```bash
ssh root@<static-ip>
```

### Step 2: Download Project

```bash
git clone https://github.com/slagout/family-planner.git /opt/family-planner
cd /opt/family-planner
```

### Step 3: Run Setup Script

```bash
# Install Docker, Docker Compose, configure system
chmod +x ubuntu-setup.sh
sudo ./ubuntu-setup.sh
```

This script:
- Installs Docker and Docker Compose
- Configures kernel parameters for production
- Creates project directories
- Sets up systemd service
- Configures firewall

**Time**: ~15 minutes

### Step 4: Configure Environment

```bash
# Copy template
cp .env.prod.example .env.prod

# Edit with your values
nano .env.prod
```

**Required values** to change:
- `DOMAIN` - Your actual domain
- `POSTGRES_PASSWORD` - Generate: `openssl rand -base64 32`
- `KEYCLOAK_ADMIN_PASSWORD` - Generate: `openssl rand -base64 32`
- `KEYCLOAK_CLIENT_SECRET` - Generate: `openssl rand -base64 32`
- `LETSENCRYPT_EMAIL` - Your email
- All other `*_PASSWORD` fields

### Step 5: Configure Network

```bash
# Setup static IP and firewall
chmod +x network-config.sh
sudo ./network-config.sh eth0 192.168.1.100 192.168.1.1 255.255.255.0

# Verify
sudo ufw status
```

### Step 6: Setup SSL

```bash
# Automate Let's Encrypt certificate management
chmod +x ssl-setup.sh
sudo ./ssl-setup.sh family-planner.example.com admin@example.com
```

### Step 7: Deploy

```bash
# Load environment
source .env.prod

# Start all services
docker compose -f docker-compose.prod.yml up -d

# Wait for services to initialize (60 seconds)
sleep 60

# Check status
docker compose -f docker-compose.prod.yml ps

# Run health checks
chmod +x health-check.sh
./health-check.sh family-planner.example.com 443 https
```

Expected output: ✓ All critical services are healthy!

## Access Services

| Service | URL | Default Credentials |
|---------|-----|---|
| **Frontend** | https://family-planner.example.com | N/A |
| **API** | https://family-planner.example.com/api | N/A |
| **Traefik Dashboard** | http://192.168.1.100:8080 | N/A |
| **Prometheus** | http://192.168.1.100:9090 | N/A |
| **Grafana** | http://192.168.1.100:3000 | admin / [from .env.prod] |
| **Graylog** | http://192.168.1.100:9000 | admin / [from .env.prod] |
| **Keycloak** | https://family-planner.example.com/auth | admin / [from .env.prod] |

## Verify All Services

```bash
# Check all containers are running
docker compose -f docker-compose.prod.yml ps

# Expected: All showing "Up" status and "healthy"

# View logs
docker compose -f docker-compose.prod.yml logs -f backend

# Test API
curl https://family-planner.example.com/api/health

# Test Frontend
curl https://family-planner.example.com/
```

## Management Commands

### View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f postgres
```

### Restart Service

```bash
# Restart backend
docker compose -f docker-compose.prod.yml restart backend

# Restart all
docker compose -f docker-compose.prod.yml restart
```

### Backup Data

```bash
# Manual backup (also runs daily at midnight)
./scripts/backup.sh

# Verify backup
ls -lh /opt/family-planner/backups/
```

### Check Service Health

```bash
# Interactive health check
./health-check.sh family-planner.example.com 443 https

# Manual checks
curl -f https://family-planner.example.com/api/health
curl -f https://family-planner.example.com/api/health/ready
curl -f https://family-planner.example.com/api/health/live
```

## Monitoring

### Grafana Dashboards

1. Access: http://192.168.1.100:3000
2. Login: admin / [password from .env.prod]
3. Pre-configured dashboards:
   - Overview - System health
   - Backend - Application metrics
   - Database - PostgreSQL stats
   - Infrastructure - CPU, memory, disk

### Alert Rules

Alerts automatically trigger for:
- Backend service down
- High error rate (>5%)
- High latency (P99 > 1s)
- Database down
- Disk usage >85%
- Memory usage >85%
- Container restart loops

View alerts in Prometheus: http://192.168.1.100:9090/alerts

### Centralized Logging

1. Access: http://192.168.1.100:9000
2. Login: admin / [password from .env.prod]
3. Search logs by field: `level:ERROR AND service:backend`
4. Set up saved searches for common queries

## Troubleshooting

### Services won't start

```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Verify .env.prod has all required variables
grep -E "^[A-Z_]+=" .env.prod | wc -l

# Check disk space
df -h

# Restart Docker
sudo systemctl restart docker
```

### High disk usage

```bash
# Check Docker usage
docker system df

# Clean up old images
docker image prune -a

# Clean old logs
docker exec family-planner-db vacuumdb -U fp_user family_planner
```

### Database issues

```bash
# Check PostgreSQL
docker exec family-planner-db psql -U fp_user -d family_planner -c "SELECT 1"

# Check connections
docker exec family-planner-db psql -U fp_user -d family_planner -c "SELECT * FROM pg_stat_activity;"
```

### Performance issues

```bash
# Monitor metrics in real-time
docker stats

# Check specific container
docker stats family-planner-backend

# Increase resource limits in docker-compose.prod.yml if needed
# Restart services to apply changes
docker compose -f docker-compose.prod.yml up -d
```

## Daily Operations

### Morning Check

```bash
# SSH into production server
ssh root@family-planner.example.com

# Check all services
docker compose -f docker-compose.prod.yml ps

# Check logs for errors
docker compose -f docker-compose.prod.yml logs | grep ERROR | tail -20

# Review Grafana dashboard
# Open: http://192.168.1.100:3000
```

### Before Any Updates

```bash
# Always create backup first
./scripts/backup.sh

# Verify backup
tar -tzf /opt/family-planner/backups/family-planner-backup-*.tar.gz | head -20
```

### Monthly Tasks

- [ ] Review and rotate secrets in .env.prod
- [ ] Update Docker base images
- [ ] Clean up old backups (keeping last 7)
- [ ] Review alert thresholds in prometheus
- [ ] Test recovery procedures
- [ ] Update documentation with improvements

## Rolling Updates (Zero Downtime)

```bash
# 1. Update code
cd /opt/family-planner
git pull origin main

# 2. Create backup before updating
./scripts/backup.sh

# 3. Rebuild images with new code
docker compose -f docker-compose.prod.yml build

# 4. Deploy new version (automatic health checks prevent issues)
docker compose -f docker-compose.prod.yml up -d

# 5. Verify health
./health-check.sh family-planner.example.com 443 https

# 6. Monitor for 15 minutes
docker compose -f docker-compose.prod.yml logs -f | grep -i error
```

## Emergency Rollback

```bash
# If deployment fails, immediate rollback:

# 1. Stop broken services
docker compose -f docker-compose.prod.yml down

# 2. Restore from backup
gunzip < /opt/family-planner/backups/family-planner-backup-*.sql.gz | \
  docker exec -i family-planner-db psql -U fp_user -d family_planner

# 3. Revert code to last known good
git revert HEAD
git push origin main

# 4. Deploy again
docker compose -f docker-compose.prod.yml up -d

# 5. Verify
./health-check.sh family-planner.example.com 443 https
```

## Complete Documentation

For detailed information, see:
- **INFRASTRUCTURE.md** - Full architecture, scaling, disaster recovery
- **DEPLOYMENT.md** - Detailed deployment procedures and checklists

## Support

- **On-Call Contact**: [Your contact]
- **Monitoring Dashboard**: http://192.168.1.100:3000
- **Logs**: http://192.168.1.100:9000
- **Repository**: https://github.com/slagout/family-planner

---

**Last Updated**: 2024-01-15  
**Quick Start Version**: 1.0
