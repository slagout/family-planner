# Family Planner - Production Infrastructure Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Deployment Architecture](#deployment-architecture)
3. [Prerequisites](#prerequisites)
4. [Initial Setup](#initial-setup)
5. [Configuration](#configuration)
6. [Deployment](#deployment)
7. [Monitoring & Observability](#monitoring--observability)
8. [Backup & Recovery](#backup--recovery)
9. [Troubleshooting](#troubleshooting)
10. [Scaling](#scaling)
11. [Blue-Green Deployment](#blue-green-deployment)

---

## Architecture Overview

### Stack Components

```
┌─────────────────────────────────────────────────────────────────┐
│                          Traefik Reverse Proxy                  │
│                    (TLS, Load Balancing, Routing)               │
└──────────┬──────────────────────────────┬──────────────────────┘
           │                              │
    ┌──────▼──────┐           ┌──────────▼────────┐
    │ React       │           │ Express Backend   │
    │ Frontend    │           │ + TypeScript      │
    │ Nginx       │           │ (Port 4000)       │
    └─────────────┘           └──────┬───────────┘
                                     │
        ┌────────────┬───────────────┼──────────────┬─────────────┐
        │            │               │              │             │
    ┌───▼──┐  ┌─────▼───┐    ┌──────▼────┐  ┌────▼───┐   ┌─────▼───┐
    │ Pg   │  │ MongoDB │    │ Keycloak  │  │ Redis  │   │ Graylog │
    │ SQL  │  │ Replica │    │ OAuth 2.0 │  │ Cache  │   │ Logging │
    │      │  │ Set×3   │    │           │  │        │   │ + ES    │
    └──────┘  └─────────┘    └───────────┘  └────────┘   └─────────┘

    ┌──────────────────────────────────────────────────────────────┐
    │  Prometheus (Metrics) + Grafana (Dashboards + Alerts)       │
    └──────────────────────────────────────────────────────────────┘
```

### Key Technologies

| Component | Version | Purpose |
|-----------|---------|---------|
| Docker | 24.x | Containerization |
| Docker Compose | 2.20+ | Orchestration |
| PostgreSQL | 16 | Primary relational database |
| MongoDB | 7.0 | Document store (analytics, logs) |
| Keycloak | 22.0 | Identity & Access Management |
| Redis | 7 | Caching & session management |
| Traefik | 2.10 | Reverse proxy with Let's Encrypt |
| Prometheus | Latest | Metrics collection |
| Grafana | Latest | Dashboards & visualization |
| Graylog | 5.1 | Centralized logging |
| Elasticsearch | 8.10 | Full-text search for logs |

---

## Deployment Architecture

### High-Availability Considerations

1. **Database Redundancy**: MongoDB replica set (3 nodes) for failover
2. **Caching Layer**: Redis for session persistence and cache
3. **Load Balancing**: Traefik distributes traffic
4. **Centralized Logging**: Graylog + Elasticsearch for debugging
5. **Monitoring**: Prometheus + Grafana for visibility
6. **SSL/TLS**: Let's Encrypt via Traefik ACME

### Network Topology

```
External Network (Internet)
         │
    ┌────▼────────────────────────┐
    │   Traefik (Port 80, 443)    │
    │   Let's Encrypt TLS         │
    └────┬─────────────────────────┘
         │
    ┌────▼──────────────────────────────────────┐
    │   Docker Bridge Network (172.25.0.0/16)   │
    │                                            │
    │  ┌─────────────┐  ┌────────────────┐      │
    │  │  Frontend   │  │  Backend       │      │
    │  │  Nginx      │  │  Express       │      │
    │  └─────────────┘  └────────────────┘      │
    │                          │                 │
    │  ┌─────────┐  ┌─────┐    │    ┌────────┐  │
    │  │PostgreSQL  │Mongo │    │    │Graylog │  │
    │  │        │    │RS   │    │    │        │  │
    │  └─────────┘  └─────┘    │    └────────┘  │
    │                          │                 │
    │                   ┌──────▼────┐            │
    │                   │ Keycloak   │            │
    │                   │ Redis      │            │
    │                   └────────────┘            │
    │                                            │
    │  ┌──────────────────────────────┐          │
    │  │ Prometheus │ Grafana │ ES    │          │
    │  └──────────────────────────────┘          │
    └─────────────────────────────────────────────┘
```

---

## Prerequisites

### System Requirements

- **OS**: Ubuntu 22.04 LTS
- **CPU**: 4+ cores (8+ recommended)
- **RAM**: 16GB minimum (32GB for production)
- **Storage**: 100GB+ (SSD preferred)
- **Network**: Static public IP, DNS configured

### Software Requirements

```bash
# Install these before running deployment scripts
- Docker 24.x or later
- Docker Compose 2.20+
- curl
- git
- openssl
```

### Network Requirements

```
Firewall Rules:
- Port 80 (HTTP) - Public
- Port 443 (HTTPS) - Public
- Port 22 (SSH) - Restricted to admin networks
- Port 8080 (Traefik dashboard) - Local network only
- Port 9090 (Prometheus) - Local network only
- Port 3000 (Grafana) - Local network only
- Port 9000 (Graylog) - Local network only
```

---

## Initial Setup

### Step 1: Provision the VM

```bash
# On XCP-NG hypervisor, create Ubuntu 22.04 VM with:
# - vCPU: 8
# - RAM: 32GB
# - Disk: 200GB (SSD if available)
# - Network: Static IP
```

### Step 2: Run Ubuntu Setup Script

```bash
# SSH into your new VM
ssh root@<static-ip>

# Download and run setup script
curl -O https://raw.githubusercontent.com/slagout/family-planner/main/ubuntu-setup.sh
chmod +x ubuntu-setup.sh
sudo ./ubuntu-setup.sh

# This will:
# ✓ Install Docker & Docker Compose
# ✓ Configure system limits
# ✓ Optimize kernel parameters
# ✓ Create project directories
# ✓ Setup systemd service
# ✓ Configure firewall
```

### Step 3: Configure Network

```bash
# Configure static IP and firewall
sudo ./network-config.sh eth0 192.168.1.100 192.168.1.1 255.255.255.0

# Verify configuration
ip addr show
ufw status
```

### Step 4: Setup SSL Certificates

```bash
# Configure Let's Encrypt via Traefik
sudo ./ssl-setup.sh family-planner.example.com admin@example.com

# Traefik will automatically obtain and renew certificates
# Certificates stored in: /opt/family-planner/letsencrypt/acme.json
```

---

## Configuration

### Environment Variables (.env.prod)

Create `/opt/family-planner/.env.prod` with the following:

```bash
# Domain Configuration
ENVIRONMENT=production
DOMAIN=family-planner.example.com

# Database
POSTGRES_DB=family_planner
POSTGRES_USER=fp_user
POSTGRES_PASSWORD=<random-secure-password>

# MongoDB
MONGO_ROOT_USER=admin
MONGO_ROOT_PASSWORD=<random-secure-password>

# Redis
REDIS_PASSWORD=<random-secure-password>

# Authentication
JWT_SECRET=<random-secure-key-64-chars>

# Keycloak
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=<random-secure-password>

# Grafana
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<random-secure-password>

# Graylog
GRAYLOG_PASSWORD_SECRET=<random-secure-password>
GRAYLOG_ROOT_PASSWORD_SHA2=<sha256-of-password>

# Let's Encrypt
LETSENCRYPT_EMAIL=admin@example.com

# Optional: Kroger Integration
KROGER_CLIENT_ID=
KROGER_CLIENT_SECRET=
KROGER_REDIRECT_URI=

# Logging
LOG_LEVEL=info
```

**Generate secure values:**

```bash
# Generate password
openssl rand -base64 32

# Generate JWT secret
openssl rand -base64 64

# Generate Graylog password hash
echo -n "your_password" | sha256sum
```

### Backend Configuration

Update backend environment in `docker-compose.prod.yml`:

```yaml
environment:
  NODE_ENV: production
  PORT: 4000
  PGHOST: db
  PGPORT: 5432
  LOG_LEVEL: info
  CORS_ORIGIN: https://family-planner.example.com
```

### Traefik Configuration

Edit `traefik.yml`:

```yaml
certificatesResolvers:
  letsencrypt:
    acme:
      email: ${LETSENCRYPT_EMAIL}
      storage: /letsencrypt/acme.json
      httpChallenge:
        entryPoint: web
```

---

## Deployment

### Deploy Production Stack

```bash
cd /opt/family-planner

# Load environment
source .env.prod

# Start services
docker compose -f docker-compose.prod.yml up -d

# Verify all services are running
docker compose -f docker-compose.prod.yml ps

# Check health endpoints
curl -f http://localhost:4000/api/health
curl -f http://localhost:80/
```

### Initialize MongoDB Replica Set

After initial deployment, MongoDB replicaset initialization happens automatically via the `mongo-init` service.

Verify replica set status:

```bash
docker exec mongo1 mongosh -u admin -p $MONGO_ROOT_PASSWORD --eval "rs.status()"
```

### Access Services

| Service | URL | Credentials |
|---------|-----|-------------|
| Frontend | https://family-planner.example.com | — |
| API | https://family-planner.example.com/api | — |
| Traefik Dashboard | http://192.168.1.100:8080 | — |
| Prometheus | http://192.168.1.100:9090 | — |
| Grafana | http://192.168.1.100:3000 | admin / [password] |
| Graylog | http://192.168.1.100:9000 | admin / [password] |
| Keycloak | https://family-planner.example.com/auth | admin / [password] |

---

## Monitoring & Observability

### Prometheus Metrics Collection

Prometheus scrapes metrics every 15 seconds from:

- **Backend**: http://backend:4000/metrics
- **PostgreSQL**: Via postgres-exporter
- **MongoDB**: Via mongodb-exporter
- **Redis**: Via redis-exporter
- **Traefik**: http://traefik:8080/metrics
- **Docker**: Via socket
- **System**: Via node-exporter

### Alert Rules

Critical alerts configured in `alert-rules.yml`:

1. **Backend Down**: Service unavailable for 1+ minute
2. **Backend High Latency**: P99 latency > 1 second
3. **High Error Rate**: >5% errors in 5 minutes
4. **PostgreSQL Down**: Connection lost
5. **MongoDB Down**: Replica set unavailable
6. **High CPU**: >90% usage for 5+ minutes
7. **High Memory**: >85% usage for 5+ minutes
8. **Low Disk**: >85% full
9. **Container Restarts**: >2 restarts in 5 minutes

### Grafana Dashboards

Pre-configured dashboards:

1. **Overview**: Overall system health
2. **Backend**: Application metrics, response times, errors
3. **Database**: Connection pools, query performance
4. **Infrastructure**: CPU, memory, disk, network
5. **Docker**: Container metrics, restarts
6. **Traefik**: HTTP requests, routing decisions

### Centralized Logging (Graylog)

- **Docker logs** → Graylog → Elasticsearch
- **Backend logs** → JSON format → Graylog
- **Access logs** → Nginx/Traefik → Graylog
- **System logs** → journalctl → Graylog

View logs at: http://192.168.1.100:9000

Search syntax: `level:ERROR AND service:backend`

---

## Backup & Recovery

### Automated Backups

Backup script runs daily at midnight (configurable):

```bash
/opt/family-planner/scripts/backup.sh
```

Backups include:
- PostgreSQL database dump (compressed)
- MongoDB collections (with indexes)
- Docker volumes
- Configuration files

Location: `/opt/family-planner/backups/`

Retention: Last 7 backups kept

### Manual Backup

```bash
sudo /opt/family-planner/scripts/backup.sh
```

### Restore from Backup

```bash
# Stop services
docker compose -f docker-compose.prod.yml down

# List available backups
ls /opt/family-planner/backups/

# Restore PostgreSQL
gunzip < /opt/family-planner/backups/family-planner-backup-20240101_120000-postgres.sql.gz | \
  docker exec -i family-planner-db psql -U fp_user -d family_planner

# Restore MongoDB
docker exec -i mongo1 mongorestore --archive < /opt/family-planner/backups/family-planner-backup-20240101_120000-mongo

# Restart services
docker compose -f docker-compose.prod.yml up -d
```

---

## Troubleshooting

### Service Health Checks

```bash
# Check all service status
docker compose -f docker-compose.prod.yml ps

# View logs for a service
docker compose -f docker-compose.prod.yml logs -f backend

# Check network connectivity
docker exec backend curl -v http://db:5432

# Test database connection
docker exec family-planner-db psql -U fp_user -d family_planner -c "SELECT 1"
```

### Common Issues

#### Backend won't start
```bash
# Check logs
docker compose logs backend | tail -50

# Verify database is ready
docker compose logs db | grep "ready"

# Check environment variables
docker inspect family-planner-backend | grep -A 50 "Env"
```

#### No metrics appearing in Prometheus
```bash
# Check targets are up
curl http://localhost:9090/api/v1/targets

# Verify service is responding
curl http://localhost:4000/metrics

# Check firewall rules
sudo ufw status numbered
```

#### Disk space low
```bash
# Check disk usage
df -h

# Clean Docker
docker system prune -a

# Clean old logs
docker exec family-planner-db vacuumdb -U fp_user family_planner
```

#### Memory issues
```bash
# Check container memory usage
docker stats

# View system memory
free -h

# Adjust Docker resource limits in docker-compose.prod.yml
```

---

## Scaling

### Horizontal Scaling

For multiple backend instances:

```yaml
backend:
  deploy:
    replicas: 3
  
services:
  backend-1:
    # ...
  backend-2:
    # ...
  backend-3:
    # ...

# Traefik automatically load-balances
```

### Vertical Scaling

Adjust resource limits:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### Database Scaling

MongoDB replica set already provides:
- Automatic failover
- Read replicas (for scaling reads)
- Sharding (future: for very large datasets)

PostgreSQL:
- Read replicas via streaming replication
- Connection pooling via pgBouncer (future)

---

## Blue-Green Deployment

### Strategy

Two identical production environments (Blue & Green) running in parallel.

### Steps

```bash
# 1. Current production is "Blue"
docker compose -f docker-compose.prod.yml -p family-planner-blue ps

# 2. Deploy new version to "Green"
docker compose -f docker-compose.prod.yml -p family-planner-green up -d

# 3. Run smoke tests on Green
curl http://localhost:8001/api/health  # Green health check

# 4. If successful, switch Traefik to route to Green
# (Update Traefik config to route to family-planner-green network)

# 5. Keep Blue running as quick rollback
# If Green fails:
docker compose -f docker-compose.prod.yml -p family-planner-green down
# Traffic automatically reverts to Blue
```

### Rollback Procedure

```bash
# If Green deployment fails after switch:
# 1. Update Traefik routing back to Blue
# 2. Verify traffic restored
# 3. Stop Green and investigate
docker compose -f docker-compose.prod.yml -p family-planner-green down
docker logs family-planner-green_backend_1 | head -100
```

---

## Maintenance

### System Updates

```bash
# Monthly: Update base images
docker pull postgres:16-alpine
docker pull node:20-alpine
docker pull redis:7-alpine
docker pull mongo:7.0

# Rebuild and restart
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d
```

### Certificate Renewal

Automated via systemd timer:

```bash
# Verify timer is active
sudo systemctl status renew-certs.timer

# Manual renewal if needed
sudo /opt/family-planner/scripts/renew-certs.sh
```

### Database Maintenance

```bash
# PostgreSQL VACUUM (cleanup dead tuples)
docker exec family-planner-db vacuumdb -U fp_user family_planner

# MongoDB rebuild indexes
docker exec mongo1 mongosh -u admin -p $MONGO_ROOT_PASSWORD --eval "db.collection.reIndex()"
```

---

## Disaster Recovery Plan

### RTO & RPO Targets

| Metric | Target |
|--------|--------|
| Recovery Time Objective (RTO) | 2 hours |
| Recovery Point Objective (RPO) | 24 hours (daily backups) |

### Recovery Steps

1. **Full System Loss**: Restore latest backup to new VM
2. **Database Corruption**: Restore from backup
3. **Partial Data Loss**: Point-in-time recovery from backups
4. **Service Failure**: Auto-restart via Docker healthchecks
5. **Node Failure**: MongoDB/PostgreSQL replicas takeover

---

## Support & Escalation

### Emergency Contacts

- **On-Call**: [Contact info]
- **Escalation**: [Management contact]
- **Security Issues**: [Security team contact]

### Monitoring Dashboard

- Grafana: http://192.168.1.100:3000
- Prometheus: http://192.168.1.100:9090
- Graylog: http://192.168.1.100:9000
- Traefik: http://192.168.1.100:8080

---

## References

- [Docker Documentation](https://docs.docker.com/)
- [Traefik Documentation](https://doc.traefik.io/)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Graylog Documentation](https://docs.graylog.org/)
- [MongoDB Replica Sets](https://docs.mongodb.com/manual/replication/)

---

**Last Updated**: 2024-01-15
**Version**: 1.0
**Maintained By**: DevOps Team
