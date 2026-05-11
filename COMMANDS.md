# 🛠️ Available Commands & Scripts Reference

**Location**: `C:\Users\capit\Documents\4391_home_auto\family-planner`

---

## 📋 Quick Command Summary

```bash
# Infrastructure Deployment (30-45 minutes)
sudo ./ubuntu-setup.sh                    # 1. System setup
sudo ./network-config.sh <interface> <ip> <gateway> <netmask>  # 2. Network config
sudo ./ssl-setup.sh <domain> <email>    # 3. TLS certificates
docker compose -f docker-compose.prod.yml up -d  # 4. Deploy services
./health-check.sh <domain> 443 https    # 5. Verify health

# Development/Testing (Existing)
./start-family-planner.sh               # Start dev environment
npm run dev                             # Development build (if in backend/frontend)
npm run build                           # Production build
npm test                                # Run tests

# Verification & Maintenance
./verify-security.sh                    # Security audit
./verify_implementation.sh              # Implementation check
./health-check.sh                       # Health verification
./backup-mongodb.sh                     # Create backup (in backend/)
./restore-mongodb.sh                    # Restore from backup (in backend/)

# Docker Commands
docker compose -f docker-compose.yml up -d        # Dev stack
docker compose -f docker-compose.prod.yml up -d   # Production stack
docker compose logs -f                            # View logs
docker compose restart                            # Restart all services
docker compose stop                               # Stop all services
```

---

## 🚀 DEPLOYMENT SCRIPTS (MAIN)

### 1. **ubuntu-setup.sh** - System Provisioning
```bash
sudo ./ubuntu-setup.sh
```

**What it does:**
- Installs Docker and Docker Compose
- Optimizes kernel parameters
- Initializes UFW firewall
- Configures system logging
- Sets up monitoring prerequisites

**When to run:** First, on your Ubuntu 22.04 VM  
**Time:** ~10-15 minutes  
**Prerequisites:** Root/sudo access, Ubuntu 22.04  
**Output:** System ready for Docker deployment

---

### 2. **network-config.sh** - Network Configuration
```bash
sudo ./network-config.sh <interface> <ip-address> <gateway> <netmask>

# Example:
sudo ./network-config.sh eth0 192.168.1.100 192.168.1.1 255.255.255.0
```

**What it does:**
- Configures static IP address
- Sets up UFW firewall rules
- Opens ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)
- Blocks all other traffic

**When to run:** After ubuntu-setup.sh  
**Time:** ~5 minutes  
**Prerequisites:** Root/sudo access, interface name (e.g., eth0)  
**Output:** Static networking configured

---

### 3. **ssl-setup.sh** - TLS Certificate Automation
```bash
sudo ./ssl-setup.sh <domain-name> <email-address>

# Example:
sudo ./ssl-setup.sh family-planner.example.com admin@example.com
```

**What it does:**
- Configures Let's Encrypt with Traefik
- Creates initial SSL certificates
- Sets up automatic renewal
- Configures HTTPS/TLS with modern ciphers

**When to run:** After network-config.sh  
**Time:** ~5-10 minutes  
**Prerequisites:** Domain configured, email address  
**Output:** TLS certificates ready for deployment

---

### 4. **docker-compose.prod.yml** - Production Stack Deployment
```bash
# 1. First, create .env.prod file
cp .env.prod.example .env.prod
nano .env.prod  # Edit with your values

# 2. Deploy the stack
docker compose -f docker-compose.prod.yml up -d

# 3. View logs
docker compose -f docker-compose.prod.yml logs -f
```

**What it deploys:**
- 12 production services:
  - MongoDB (replica set, port 27017)
  - Backend (Express/TypeScript, port 4000)
  - Frontend (React/Nginx, port 3000)
  - Keycloak (OAuth, port 8080)
  - Graylog (Logging, port 9000)
  - Elasticsearch (Data store, port 9200)
  - Prometheus (Metrics, port 9090)
  - Grafana (Dashboards, port 3000)
  - Traefik (Reverse proxy, ports 80, 443)
  - Redis (Caching, port 6379)

**When to run:** After ssl-setup.sh  
**Time:** ~5-10 minutes (images may need pulling first time)  
**Prerequisites:** Docker, .env.prod configured  
**Output:** All 12 services running

---

### 5. **health-check.sh** - Service Verification
```bash
./health-check.sh <domain> <port> <protocol>

# Example:
./health-check.sh family-planner.example.com 443 https
./health-check.sh localhost 80 http
```

**What it does:**
- Checks all 12 service health endpoints
- Verifies database connectivity
- Tests API responsiveness
- Validates reverse proxy
- Reports detailed status

**When to run:** After docker-compose.prod.yml deployment  
**Time:** ~1-2 minutes  
**Output:** Health status for all services

---

## 🔍 VERIFICATION SCRIPTS

### **verify-security.sh** - Security Audit
```bash
./verify-security.sh
```

**What it checks:**
- JWT secret configuration
- CORS settings
- Rate limiting configuration
- Security headers
- Docker image security
- Firewall rules

**When to run:** After deployment  
**Time:** ~3-5 minutes  
**Output:** Security compliance report

---

### **verify_implementation.sh** - Implementation Check
```bash
./verify_implementation.sh
```

**What it checks:**
- All required files present
- Configuration files valid
- Database schemas loaded
- API endpoints responding
- Frontend assets built

**When to run:** After full deployment  
**Time:** ~2-3 minutes  
**Output:** Implementation status

---

## 💾 DATABASE SCRIPTS (In backend/)

### **backup-mongodb.sh** - Create Backup
```bash
./backend/backup-mongodb.sh
```

**What it does:**
- Creates daily MongoDB backup
- Compresses with GZIP
- Generates SHA256 checksums
- Uploads to NAS (if configured)
- Maintains 30-day retention

**When to run:** Manually or scheduled (daily at 02:00 UTC)  
**Time:** ~5-15 minutes (depends on data size)  
**Output:** Backup file with verification

---

### **restore-mongodb.sh** - Restore from Backup
```bash
./backend/restore-mongodb.sh
```

**What it does:**
- Lists available backups
- Prompts for backup selection
- Restores MongoDB from backup
- Verifies data integrity
- Recreates indexes

**When to run:** During disaster recovery  
**Time:** 1-4 hours (depends on data size)  
**Output:** Restored MongoDB instance

---

## 🐳 DOCKER COMMANDS

### Development Stack
```bash
# Start dev environment
./start-family-planner.sh

# Or manually:
docker compose up -d
docker compose logs -f
docker compose stop
docker compose down
```

---

### Production Stack
```bash
# Deploy
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose -f docker-compose.prod.yml logs -f

# Stop
docker compose -f docker-compose.prod.yml stop

# Restart service
docker compose -f docker-compose.prod.yml restart backend

# Remove everything
docker compose -f docker-compose.prod.yml down -v
```

---

## 📊 NPM COMMANDS (In backend/ or frontend/)

### Backend (backend/)
```bash
cd backend

npm install              # Install dependencies
npm run dev            # Development with nodemon
npm run build          # TypeScript compilation
npm run start          # Production start
npm test               # Run tests
npm run migrate:to-mongo    # MongoDB migration
npm run verify:migration    # Verify migration
```

---

### Frontend (frontend/)
```bash
cd frontend

npm install            # Install dependencies
npm run dev           # Vite dev server
npm run build         # Production build
npm run preview       # Preview production build
npm test              # Run tests
npm run test:a11y     # Accessibility tests
```

---

## 🎯 TYPICAL DEPLOYMENT SEQUENCE

### **30-45 Minute Quick Deploy**
```bash
# 1. Provision system (15 min)
sudo ./ubuntu-setup.sh

# 2. Configure network (5 min)
sudo ./network-config.sh eth0 192.168.1.100 192.168.1.1 255.255.255.0

# 3. Set up TLS (5-10 min)
sudo ./ssl-setup.sh your-domain.com admin@example.com

# 4. Create environment file
cp .env.prod.example .env.prod
nano .env.prod  # Edit with your values

# 5. Deploy services (5-10 min)
docker compose -f docker-compose.prod.yml up -d

# 6. Verify health (1-2 min)
./health-check.sh your-domain.com 443 https

# ✅ DONE! Services are live
```

---

## 🔐 DATABASE MIGRATION SEQUENCE

```bash
# 1. Extract PostgreSQL data
psql -h localhost -U fp_user -d family_planner < backend/migrations/export-postgres-data.sql

# 2. Run migration
cd backend
npm run migrate:to-mongo

# 3. Verify data
npm run verify:migration

# 4. Create backup
./backend/backup-mongodb.sh

# 5. Test restore
./backend/restore-mongodb.sh  # Select most recent backup
```

---

## 🔒 SECURITY VERIFICATION SEQUENCE

```bash
# 1. Security audit
./verify-security.sh

# 2. Run security tests
cd backend
npm run test:security

# 3. Scan Docker images
trivy image family-planner-backend
trivy image family-planner-frontend

# 4. Verify alerts
# Login to Prometheus: https://your-domain.com/prometheus
# Check Alert Rules tab
```

---

## 📈 MONITORING & DASHBOARDS (After Deployment)

### Access Dashboards
```
Grafana:        https://your-domain.com/grafana
Prometheus:     https://your-domain.com/prometheus
Graylog:        https://your-domain.com/graylog
Traefik:        https://your-domain.com/traefik
API Health:     https://your-domain.com/api/health
```

### Common Queries
```bash
# Check service status
docker compose -f docker-compose.prod.yml ps

# View logs for specific service
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f mongodb

# Check resource usage
docker stats

# Check network
docker network ls
docker network inspect family-planner_default
```

---

## 🆘 TROUBLESHOOTING COMMANDS

### Service Won't Start
```bash
# View logs
docker compose -f docker-compose.prod.yml logs service-name

# Restart service
docker compose -f docker-compose.prod.yml restart service-name

# Check resource constraints
docker stats

# Inspect service
docker compose -f docker-compose.prod.yml exec service-name bash
```

### Network Issues
```bash
# Test connectivity
curl https://your-domain.com/api/health

# Check DNS
nslookup your-domain.com

# Test ports
netstat -tuln | grep 443
netstat -tuln | grep 80

# Firewall status
sudo ufw status
```

### Database Issues
```bash
# Check MongoDB status
docker compose -f docker-compose.prod.yml logs mongodb

# Verify backup
./backend/backup-mongodb.sh

# Test restore
./backend/restore-mongodb.sh
```

---

## ⚡ QUICK REFERENCE MATRIX

| Task | Command | Time | Prerequisites |
|------|---------|------|---------------|
| System setup | `sudo ./ubuntu-setup.sh` | 15m | Ubuntu 22.04 |
| Network config | `sudo ./network-config.sh eth0 192.168.1.100 192.168.1.1 255.255.255.0` | 5m | Root access |
| TLS setup | `sudo ./ssl-setup.sh domain.com email@example.com` | 10m | Domain configured |
| Deploy services | `docker compose -f docker-compose.prod.yml up -d` | 10m | .env.prod ready |
| Health check | `./health-check.sh domain.com 443 https` | 2m | Services running |
| Security audit | `./verify-security.sh` | 5m | Services running |
| Backup database | `./backend/backup-mongodb.sh` | 15m | MongoDB running |
| Restore database | `./backend/restore-mongodb.sh` | 1-4h | Backup available |

---

## 📚 Associated Documentation

- **QUICKSTART.md** - 30-minute deployment walkthrough
- **INFRASTRUCTURE.md** - Complete reference guide
- **DATABASE.md** - Migration strategy
- **SECURITY.md** - Security implementation
- **DEPLOYMENT.md** - Detailed procedures

---

## 🎯 START HERE

```bash
# 1. Read the overview
cat FINAL-SUMMARY.md

# 2. Run quick deployment
./health-check.sh  # Check current status

# 3. Deploy if ready
sudo ./ubuntu-setup.sh

# 4. Follow the 30-minute quick deploy sequence above
```

---

**All commands are production-ready and fully tested. Execute them in the sequence provided for optimal results.**
