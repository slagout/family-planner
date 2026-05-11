#!/bin/bash

# 🛠️ FAMILY PLANNER - QUICK COMMAND REFERENCE
# Location: C:\Users\capit\Documents\4391_home_auto\family-planner\
# Status: Production Orchestration Complete ✅

echo "
╔══════════════════════════════════════════════════════════════════════════════╗
║                   FAMILY PLANNER COMMAND REFERENCE                           ║
║                                                                              ║
║  Repository: C:\Users\capit\Documents\4391_home_auto\family-planner          ║
║  Status: Production Ready ✅                                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝

📋 QUICK COMMAND LIST
═══════════════════════════════════════════════════════════════════════════════

🚀 INFRASTRUCTURE DEPLOYMENT (30-45 minutes)
─────────────────────────────────────────────────────────────────────────────

  sudo ./ubuntu-setup.sh
    → System provisioning (Docker, kernel, firewall)
    → Run FIRST on Ubuntu 22.04 VM
    → Time: ~15 minutes

  sudo ./network-config.sh eth0 192.168.1.100 192.168.1.1 255.255.255.0
    → Network configuration (static IP, UFW)
    → Run SECOND after ubuntu-setup.sh
    → Time: ~5 minutes
    → Adjust eth0, IP, gateway, netmask as needed

  sudo ./ssl-setup.sh family-planner.example.com admin@example.com
    → TLS certificate automation (Let's Encrypt)
    → Run THIRD after network-config.sh
    → Time: ~5-10 minutes
    → Replace with your domain and email

  docker compose -f docker-compose.prod.yml up -d
    → Deploy 12-service production stack
    → Run FOURTH after ssl-setup.sh
    → First: cp .env.prod.example .env.prod && edit .env.prod
    → Time: ~5-10 minutes
    → Creates: MongoDB, backend, frontend, Keycloak, logging, monitoring

  ./health-check.sh family-planner.example.com 443 https
    → Verify all services healthy
    → Run FIFTH after docker-compose deployment
    → Time: ~1-2 minutes
    → Shows status of all 12 services

═══════════════════════════════════════════════════════════════════════════════

🔍 VERIFICATION & SECURITY
─────────────────────────────────────────────────────────────────────────────

  ./verify-security.sh
    → Security audit (JWT, CORS, rate limiting, headers, firewall)
    → Time: ~3-5 minutes
    → Generates compliance report

  ./verify_implementation.sh
    → Check all implementation components
    → Time: ~2-3 minutes
    → Verifies files, configs, databases, APIs

═══════════════════════════════════════════════════════════════════════════════

💾 DATABASE OPERATIONS (In backend/)
─────────────────────────────────────────────────────────────────────────────

  ./backend/backup-mongodb.sh
    → Create automated MongoDB backup
    → Uploads to NAS, maintains 30-day retention
    → Time: ~5-15 minutes

  ./backend/restore-mongodb.sh
    → Restore from backup (interactive)
    → Select backup date to restore
    → Time: ~1-4 hours

  npm run migrate:to-mongo  (in backend/)
    → Migrate from PostgreSQL to MongoDB
    → Time: ~30-60 minutes

  npm run verify:migration  (in backend/)
    → Validate migration integrity
    → 15+ data validation checks
    → Time: ~2-5 minutes

═══════════════════════════════════════════════════════════════════════════════

🐳 DOCKER COMMANDS
─────────────────────────────────────────────────────────────────────────────

  Development Stack:
    ./start-family-planner.sh           → Start dev environment
    docker compose up -d                → Deploy dev stack
    docker compose logs -f              → View logs
    docker compose stop                 → Stop services
    docker compose down                 → Remove services

  Production Stack:
    docker compose -f docker-compose.prod.yml up -d
    docker compose -f docker-compose.prod.yml logs -f
    docker compose -f docker-compose.prod.yml restart backend
    docker compose -f docker-compose.prod.yml stop

  Utilities:
    docker ps                           → List running containers
    docker stats                        → Resource usage
    docker network ls                   → List networks
    docker logs <container>             → View container logs

═══════════════════════════════════════════════════════════════════════════════

📦 NPM COMMANDS (Backend)
─────────────────────────────────────────────────────────────────────────────

  npm install                 → Install dependencies
  npm run dev                 → Development (nodemon)
  npm run build               → TypeScript compilation
  npm run start               → Production start
  npm test                    → Run test suite
  npm run test:security       → Security tests
  npm run migrate:to-mongo    → Migration engine
  npm run verify:migration    → Verify migration

═══════════════════════════════════════════════════════════════════════════════

🎨 NPM COMMANDS (Frontend)
─────────────────────────────────────────────────────────────────────────────

  npm install                 → Install dependencies
  npm run dev                 → Vite dev server
  npm run build               → Production build
  npm run preview             → Preview build
  npm test                    → Run tests
  npm run test:a11y           → Accessibility audit

═══════════════════════════════════════════════════════════════════════════════

📊 DASHBOARDS (After Deployment)
─────────────────────────────────────────────────────────────────────────────

  Grafana:        https://your-domain.com/grafana
    → Dashboards, alerts, metrics visualization

  Prometheus:     https://your-domain.com/prometheus
    → Metrics, targets, alert rules

  Graylog:        https://your-domain.com/graylog
    → Centralized logging, search

  Traefik:        https://your-domain.com/traefik
    → Routing status, certificates

  API Health:     https://your-domain.com/api/health
    → Service status endpoint

═══════════════════════════════════════════════════════════════════════════════

🎯 TYPICAL DEPLOYMENT SEQUENCE
─────────────────────────────────────────────────────────────────────────────

  1. sudo ./ubuntu-setup.sh
  2. sudo ./network-config.sh eth0 192.168.1.100 192.168.1.1 255.255.255.0
  3. sudo ./ssl-setup.sh your-domain.com admin@example.com
  4. cp .env.prod.example .env.prod && nano .env.prod
  5. docker compose -f docker-compose.prod.yml up -d
  6. ./health-check.sh your-domain.com 443 https
  7. ./verify-security.sh
  8. Done! ✅

═══════════════════════════════════════════════════════════════════════════════

⚡ QUICK REFERENCE

  Task                      Command
  ────────────────────────────────────────────────────────────────────────
  System setup              sudo ./ubuntu-setup.sh
  Network config            sudo ./network-config.sh eth0 192.168.1.100...
  TLS setup                 sudo ./ssl-setup.sh domain.com email@ex.com
  Deploy services           docker compose -f docker-compose.prod.yml up -d
  Check health              ./health-check.sh domain.com 443 https
  Security audit            ./verify-security.sh
  Backup database           ./backend/backup-mongodb.sh
  Restore database          ./backend/restore-mongodb.sh
  View logs                 docker compose logs -f
  Restart service           docker compose restart backend

═══════════════════════════════════════════════════════════════════════════════

📚 DOCUMENTATION
─────────────────────────────────────────────────────────────────────────────

  COMMANDS.md               ← Detailed command reference (THIS FILE)
  FINAL-SUMMARY.md          ← Executive overview
  QUICKSTART.md             ← 30-minute deployment guide
  INFRASTRUCTURE.md         ← Complete infrastructure reference
  DATABASE.md               ← Database migration strategy
  SECURITY.md               ← Security implementation
  FRONTEND_ARCHITECTURE.md  ← Frontend details

═══════════════════════════════════════════════════════════════════════════════

🆘 TROUBLESHOOTING

  Service won't start?
    → docker compose logs service-name
    → docker compose restart service-name

  Health check fails?
    → ./health-check.sh your-domain.com 443 https
    → curl https://your-domain.com/api/health

  Network issues?
    → curl https://your-domain.com/api/health
    → netstat -tuln | grep 443
    → sudo ufw status

  Database issues?
    → docker compose logs mongodb
    → ./backend/backup-mongodb.sh
    → ./backend/restore-mongodb.sh

═══════════════════════════════════════════════════════════════════════════════

🚀 GET STARTED NOW

  1. Read:    cat FINAL-SUMMARY.md
  2. Deploy:  sudo ./ubuntu-setup.sh
  3. Follow:  30-minute deployment sequence above

═══════════════════════════════════════════════════════════════════════════════
"

# Show available scripts
echo "
✅ AVAILABLE SCRIPTS IN THIS DIRECTORY
─────────────────────────────────────────────────────────────────────────────
"
ls -lh *.sh 2>/dev/null || echo "No scripts found in current directory"

echo "
✅ AVAILABLE DOCKER COMPOSE FILES
─────────────────────────────────────────────────────────────────────────────
"
ls -lh docker-compose*.yml 2>/dev/null || echo "No docker-compose files found"

echo "
✅ AVAILABLE CONFIGURATION FILES
─────────────────────────────────────────────────────────────────────────────
"
ls -lh *.yml 2>/dev/null | grep -v docker-compose || echo "Configuration files not listed"

echo "
═══════════════════════════════════════════════════════════════════════════════

📖 For detailed information, see: COMMANDS.md

🎯 Ready to deploy? Start with: sudo ./ubuntu-setup.sh

═══════════════════════════════════════════════════════════════════════════════
"
