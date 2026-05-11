# Production Deployment Guide - Family Planner

This document provides guidance for deploying Family Planner to production environments.

## 📋 Deployment Overview

Family Planner provides a complete production-ready stack with:

- **High Availability**: PostgreSQL with persistent volumes, Redis caching
- **Load Balancing**: Traefik reverse proxy
- **Monitoring**: Prometheus + Grafana dashboards
- **Logging**: Centralized Graylog + Elasticsearch
- **Security**: Let's Encrypt TLS, JWT auth, Keycloak OAuth
- **Caching**: Redis for sessions and performance
- **Backups**: Automated daily backups with retention policy

## 🎯 Quick Deployment (30 minutes)

See **[QUICKSTART.md](./QUICKSTART.md)** for step-by-step instructions to deploy on Ubuntu 22.04.

### Minimal Steps

```bash
# 1. Run setup script
sudo ./ubuntu-setup.sh

# 2. Configure environment
cp .env.prod.example .env.prod
nano .env.prod  # Update DOMAIN, passwords, etc.

# 3. Setup network & SSL
sudo ./network-config.sh eth0 192.168.1.100 192.168.1.1 255.255.255.0
sudo ./ssl-setup.sh family-planner.example.com admin@example.com

# 4. Deploy
docker compose -f docker-compose.prod.yml up -d

# 5. Verify
./health-check.sh family-planner.example.com 443 https
```

## 📚 Complete Documentation

| Document | Purpose |
|----------|---------|
| **[QUICKSTART.md](./QUICKSTART.md)** | 30-minute quick reference |
| **[INFRASTRUCTURE.md](./INFRASTRUCTURE.md)** | Complete architecture & operations guide (17,000+ words) |
| **[DEPLOYMENT.md](./DEPLOYMENT.md)** | Detailed deployment procedures with checklists |

## 🏗️ Production Architecture

```
External Network (Internet)
    ↓
Traefik (Port 80, 443, TLS)
    ├─→ Frontend (Nginx)
    ├─→ Backend (Express/TypeScript)
    └─→ Keycloak (OAuth)
        ↓
    ┌───────────────────────────────┐
    │   Docker Bridge Network       │
    │                               │
    ├─ PostgreSQL (Immutable DB)    │
    ├─ Keycloak (OAuth 2.0)        │
    ├─ Redis (Cache)               │
    ├─ Graylog (Logging)           │
    ├─ Elasticsearch (Search)      │
    ├─ Prometheus (Metrics)        │
    └─ Grafana (Dashboards)        │
```

## 📦 Key Components

### Application Services
- **Frontend**: React + Vite + Nginx
- **Backend**: Express.js + TypeScript
- **Databases**: PostgreSQL (immutable append-only schema)
- **Cache**: Redis
- **Auth**: Keycloak (OAuth 2.0)

### Infrastructure Services
- **Reverse Proxy**: Traefik with Let's Encrypt TLS
- **Monitoring**: Prometheus + Grafana
- **Logging**: Graylog + Elasticsearch
- **Health Checks**: Automated via Docker Compose

## 🔧 Configuration

### Environment Variables

All secrets should be stored in `.env.prod`:

```bash
DOMAIN=family-planner.example.com
POSTGRES_PASSWORD=<secure-random>
KEYCLOAK_ADMIN_PASSWORD=<secure-random>
KEYCLOAK_CLIENT_SECRET=<secure-random>
REDIS_PASSWORD=<secure-random>
LETSENCRYPT_EMAIL=admin@example.com
# ... see .env.prod.example for all options
```

Generate secure values:
```bash
openssl rand -base64 32  # passwords
openssl rand -base64 64  # JWT secret
```

### Service Configuration Files

- `docker-compose.prod.yml` - Full stack definition
- `traefik.yml` - Traefik core configuration
- `traefik-dynamic.yml` - Traefik routing rules
- `prometheus.yml` - Metrics scrape config
- `alert-rules.yml` - Alert definitions
- `grafana-config.yml` - Dashboard config

## 📊 Monitoring & Dashboards

### Grafana (http://192.168.1.100:3000)

Pre-configured dashboards:
1. **Overview** - System health
2. **Backend** - Application metrics, latency, errors
3. **Database** - PostgreSQL stats
4. **Infrastructure** - CPU, memory, disk, network
5. **Docker** - Container metrics & restarts

### Prometheus (http://192.168.1.100:9090)

Scrapes metrics from:
- Backend API (port 4000/metrics)
- PostgreSQL exporter
- Redis exporter
- Docker containers
- System metrics

### Graylog (http://192.168.1.100:9000)

Centralized logging dashboard with:
- Application logs
- System logs
- Access logs
- Error tracking
- Log search & analytics

## 🚀 Health Checks

All services include health check endpoints:

```bash
# Backend application health
curl https://family-planner.example.com/api/health

# Readiness check (dependencies ready)
curl https://family-planner.example.com/api/health/ready

# Liveness check (process alive)
curl https://family-planner.example.com/api/health/live

# Prometheus metrics
curl https://family-planner.example.com/api/metrics
```

Verify all services:
```bash
./health-check.sh family-planner.example.com 443 https
```

## 💾 Backup & Recovery

### Automated Backups

Daily backups run at midnight (configurable) and include:
- PostgreSQL database dump (compressed)
- Docker volumes
- Configuration files

Location: `/opt/family-planner/backups/`  
Retention: 7 latest backups

### Manual Backup

```bash
./scripts/backup.sh
```

### Restore from Backup

```bash
# Stop services
docker compose -f docker-compose.prod.yml down

# Restore PostgreSQL
gunzip < /opt/family-planner/backups/family-planner-backup-*.sql.gz | \
  docker exec -i family-planner-db psql -U fp_user -d family_planner

# Restart
docker compose -f docker-compose.prod.yml up -d
```

## 📋 Pre-Deployment Checklist

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for complete checklists:

- [ ] Infrastructure provisioned (VM, network, DNS)
- [ ] All code reviewed and tested
- [ ] Environment variables configured
- [ ] SSL certificates setup
- [ ] Monitoring alerts configured
- [ ] Backup procedures tested
- [ ] Team trained on runbooks
- [ ] Incident response plan ready

## 🔄 Deployment Procedure

### Blue-Green Deployment

Two identical stacks run in parallel for zero-downtime updates:

```bash
# Deploy new version to "green" stack
docker compose -f docker-compose.prod.yml -p family-planner-green up -d

# Run health checks
./health-check.sh family-planner.example.com 443 https

# If successful, traffic automatically routes to green
# Keep blue stack for quick rollback

# After verification, stop blue stack
docker compose -f docker-compose.prod.yml -p family-planner-blue down
```

### Rollback

If issues detected after deployment:

```bash
# Immediate rollback (< 5 minutes)
docker compose -f docker-compose.prod.yml -p family-planner-green down

# Verify traffic back to blue
curl https://family-planner.example.com/api/health
```

## ⚠️ Emergency Procedures

### Service Down

```bash
# Check status
docker compose -f docker-compose.prod.yml ps

# View logs
docker compose -f docker-compose.prod.yml logs -f [service-name]

# Restart service
docker compose -f docker-compose.prod.yml restart [service-name]
```

### Database Connection Issues

```bash
# Test PostgreSQL
docker exec family-planner-db psql -U fp_user -d family_planner -c "SELECT 1"

# Test Redis
docker exec redis redis-cli ping
```

### Disk Space

```bash
# Check usage
df -h

# Clean Docker
docker system prune -a

# Vacuum PostgreSQL
docker exec family-planner-db vacuumdb -U fp_user family_planner
```

## 🔐 Security Best Practices

1. **Secrets Management**
   - Store `.env.prod` securely (permissions: 600)
   - Rotate passwords monthly
   - Never commit secrets to git

2. **Network Security**
   - Configure firewall rules (see network-config.sh)
   - SSH key authentication only
   - Restrict admin port access (8080, 9090, 3000, 9000)

3. **SSL/TLS**
   - Let's Encrypt certificates auto-renewed by Traefik
   - Modern TLS 1.2+ with strong ciphers
   - HSTS enabled

4. **Application Security**
   - JWT validation on all protected endpoints
   - Rate limiting on auth endpoints
   - Input validation & sanitization
   - Security headers (CSP, X-Frame-Options, etc.)

## 📞 Support

For detailed information:
- **Architecture**: See [INFRASTRUCTURE.md](./INFRASTRUCTURE.md)
- **Operations**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Quick Reference**: See [QUICKSTART.md](./QUICKSTART.md)

### Monitoring Dashboards

| Service | URL | Access |
|---------|-----|--------|
| Frontend | https://family-planner.example.com | Public |
| Traefik | http://192.168.1.100:8080 | Local network |
| Prometheus | http://192.168.1.100:9090 | Local network |
| Grafana | http://192.168.1.100:3000 | Local network |
| Graylog | http://192.168.1.100:9000 | Local network |

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-01-15 | Initial production-ready release |

---

**For local development**, use the basic `docker-compose.yml` and see the main [README.md](../README.md).  
**For production deployment**, follow this guide and the documents linked above.
