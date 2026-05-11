# Family Planner - Deployment Checklist & Procedures

## Pre-Deployment Checklist

### 1. Infrastructure Readiness (Week Before)

- [ ] **VM Provisioning**
  - [ ] XCP-NG VM created with 8 vCPU, 32GB RAM, 200GB SSD
  - [ ] Ubuntu 22.04 LTS installed and updated
  - [ ] Network assigned: Static IP, DNS configured
  - [ ] SSH key deployed, password login disabled
  - [ ] Hostname set appropriately

- [ ] **Network & Firewall**
  - [ ] Static IP assigned and verified stable
  - [ ] DNS records created:
    - `family-planner.example.com` → Static IP
    - `*.family-planner.example.com` → Static IP (for subdomains)
  - [ ] Firewall configured:
    - Port 22 (SSH) - restricted to admin networks
    - Port 80 (HTTP) - public
    - Port 443 (HTTPS) - public
    - Ports 8080, 9090, 3000, 9000 - local network only
  - [ ] Internet connectivity verified (ping, curl external)
  - [ ] MTU size tested (no fragmentation)

- [ ] **Documentation Review**
  - [ ] INFRASTRUCTURE.md reviewed and team trained
  - [ ] Architecture diagram understood by team
  - [ ] Runbooks prepared for each major component
  - [ ] Escalation procedures documented

### 2. Application Preparation (Days Before)

- [ ] **Code Readiness**
  - [ ] All code committed to main branch
  - [ ] Git tags created: v1.0.0-prod
  - [ ] Changelog updated
  - [ ] Code review completed and approved
  - [ ] Security audit passed (OWASP Top 10)

- [ ] **Build & Testing**
  - [ ] Docker images built successfully
  - [ ] Local testing with docker-compose.prod.yml passed
  - [ ] All tests passing (unit, integration)
  - [ ] Performance tests acceptable (<1s P99 latency)
  - [ ] Security scanning passed (no critical CVEs)

- [ ] **Database**
  - [ ] Database schema migrations reviewed and tested
  - [ ] Seed data prepared for production
  - [ ] Backup/restore procedures tested
  - [ ] Replication configuration validated
  - [ ] Connection pooling tuned

- [ ] **Configuration**
  - [ ] .env.prod.example reviewed with team
  - [ ] All secrets generated and stored securely
  - [ ] Environment-specific configs prepared
  - [ ] Feature flags set appropriately
  - [ ] Logging levels configured (info/warning only)

### 3. Monitoring & Alerting (Days Before)

- [ ] **Monitoring Setup**
  - [ ] Prometheus configuration finalized
  - [ ] Alert rules reviewed and tested
  - [ ] Grafana dashboards created and tested
  - [ ] Dashboard links documented
  - [ ] Alerting email/Slack channels configured

- [ ] **Logging**
  - [ ] Graylog fields and parsing rules configured
  - [ ] Log retention policy set (30 days minimum)
  - [ ] Dashboard views for critical logs created
  - [ ] Log search queries documented

- [ ] **Health Checks**
  - [ ] All health check endpoints implemented
  - [ ] Health check intervals configured correctly
  - [ ] Alert thresholds set appropriately
  - [ ] Synthetic monitoring configured

### 4. Team & Communication (Day Before)

- [ ] **Team Preparation**
  - [ ] On-call schedule published
  - [ ] Incident commander identified
  - [ ] Communication channels activated (Slack, email)
  - [ ] War room meeting scheduled post-deployment
  - [ ] Rollback procedure walkthrough completed

- [ ] **Communication**
  - [ ] Deployment announcement sent to stakeholders
  - [ ] Expected downtime communicated (if any)
  - [ ] Support team briefed
  - [ ] Customer notification template prepared

---

## Deployment Day Procedure

### Phase 1: Pre-Deployment (2 Hours Before)

**Time: 10:00 AM**

- [ ] **Final Verification**
  ```bash
  # Verify all systems ready
  docker compose -f docker-compose.prod.yml config --quiet
  
  # Test connectivity to all services
  ./health-check.sh family-planner.example.com 443 https
  
  # Verify database backups exist
  ls -lh /opt/family-planner/backups/
  ```

- [ ] **System Sanity Checks**
  - [ ] Disk space check: `df -h` (>50% free)
  - [ ] Memory available: `free -h` (>10GB)
  - [ ] No critical process running: `ps aux | grep -i backup`
  - [ ] No pending system updates: `apt list --upgradable`

- [ ] **Network Verification**
  - [ ] All DNS records resolve correctly
  - [ ] Let's Encrypt staging certificates work
  - [ ] No network connectivity issues
  - [ ] BGP/routing stable (check with provider if needed)

- [ ] **Team Standup**
  - [ ] War room activated
  - [ ] All team members present and ready
  - [ ] Phone bridges working
  - [ ] Screen sharing verified

### Phase 2: Pre-Production Cutover (1 Hour Before)

**Time: 11:00 AM**

- [ ] **Create Final Backup**
  ```bash
  docker compose -f docker-compose.prod.yml down
  ./scripts/backup.sh
  # Verify backup completed successfully
  tar -tzf /opt/family-planner/backups/latest-backup.tar.gz | head -20
  ```

- [ ] **Certificate Generation**
  ```bash
  # Let's Encrypt will auto-generate, but verify staging works
  docker run -it --rm -v /opt/family-planner/letsencrypt:/etc/letsencrypt \
    certbot certonly --staging --webroot \
    -w /var/www/html -d family-planner.example.com
  ```

- [ ] **Final Code Pull**
  ```bash
  cd /opt/family-planner
  git pull origin main
  git log --oneline -5  # Verify latest commit
  ```

### Phase 3: Deployment (Start of Maintenance Window)

**Time: 12:00 PM**

- [ ] **Pull Latest Docker Images**
  ```bash
  docker compose -f docker-compose.prod.yml pull
  ```

- [ ] **Start Production Stack (Blue-Green)**
  ```bash
  # Start "GREEN" stack with new images
  docker compose -f docker-compose.prod.yml -p family-planner-green up -d
  
  # Monitor startup (wait 60 seconds for services to initialize)
  sleep 60
  docker compose -f docker-compose.prod.yml -p family-planner-green ps
  ```

- [ ] **Health Checks on Green**
  ```bash
  # Wait for all services to report healthy
  for i in {1..30}; do
    docker compose -f docker-compose.prod.yml -p family-planner-green ps | grep healthy && break
    sleep 2
  done
  
  # Run full health check
  ./health-check.sh family-planner.example.com 443 https
  ```

- [ ] **Run Smoke Tests on Green**
  ```bash
  # Test basic functionality
  curl -f https://family-planner.example.com/api/health
  curl -f https://family-planner.example.com/
  
  # Test login flow
  curl -X POST https://family-planner.example.com/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"TestPass123","displayName":"Test User"}'
  ```

- [ ] **Verify Database**
  ```bash
  # Check PostgreSQL connections
  docker exec family-planner-db psql -U fp_user -d family_planner -c "SELECT count(*) FROM pg_stat_activity;"
  
  # Verify immutable tables
  docker exec family-planner-db psql -U fp_user -d family_planner -c "\dt"
  ```

- [ ] **Monitor Metrics for 5 Minutes**
  - [ ] No error rate spikes in Prometheus
  - [ ] Response time P99 < 1000ms
  - [ ] Memory usage stable
  - [ ] No container restarts
  - [ ] Graylog receiving logs

### Phase 4: Traffic Cutover (After Green Verified Healthy)

**Time: 12:10 PM**

- [ ] **Update Traefik Configuration**
  ```bash
  # Verify Green stack DNS resolution
  docker exec traefik getent hosts family-planner-green_backend_1
  
  # Update dynamic routing to point to Green
  # (This is automatic in our Traefik configuration)
  ```

- [ ] **Verify Traffic Routing**
  ```bash
  # Check Traefik dashboard for Green stack targets
  curl http://localhost:8080/api/http/routers
  curl http://localhost:8080/api/http/services
  ```

- [ ] **Monitor Green Stack for 10 Minutes**
  - [ ] Error rate: 0%
  - [ ] P99 latency: < 1000ms
  - [ ] All services healthy
  - [ ] No spike in logs
  - [ ] Customers reporting normal operations

- [ ] **Keep Blue Stack Running (Standby)**
  ```bash
  # Blue stack stays up for quick rollback
  docker compose -f docker-compose.prod.yml -p family-planner-blue ps
  ```

### Phase 5: Post-Deployment Monitoring (30 Minutes)

**Time: 12:30 PM - 1:00 PM**

- [ ] **Continuous Monitoring**
  - [ ] Check Grafana dashboard every 5 minutes
  - [ ] Review Graylog for any errors
  - [ ] Monitor Prometheus targets are scraping
  - [ ] Check alert manager for false positives

- [ ] **Customer Validation**
  - [ ] Test critical user journeys
  - [ ] Verify data integrity
  - [ ] Confirm notifications working
  - [ ] Check 3rd party integrations (Kroger API)

- [ ] **Performance Validation**
  ```bash
  # Run performance test suite
  # (assuming you have performance tests)
  npm run test:performance
  ```

- [ ] **Security Validation**
  ```bash
  # Verify SSL/TLS certificates
  curl -v https://family-planner.example.com 2>&1 | grep "certificate"
  
  # Check security headers
  curl -I https://family-planner.example.com | grep -i "security\|csrf\|csp"
  ```

### Phase 6: Cleanup & Finalization

**Time: 1:00 PM**

- [ ] **Archive Blue Stack (after 1 hour of stability)**
  ```bash
  # If no issues detected, stop Blue stack
  docker compose -f docker-compose.prod.yml -p family-planner-blue down
  docker volume prune -f
  ```

- [ ] **Document Deployment**
  - [ ] Log all deployment metrics
  - [ ] Document any issues encountered and resolution
  - [ ] Update runbooks with lessons learned
  - [ ] Deployment summary sent to team

- [ ] **Team Wrap-up**
  - [ ] War room concluded
  - [ ] On-call shift confirmed
  - [ ] Escalation procedures reviewed
  - [ ] Schedule post-deployment review (24 hours)

---

## Rollback Procedures

### Immediate Rollback (< 5 minutes, if critical issue detected)

**Condition**: Data corruption, widespread errors, security breach detected

```bash
# IMMEDIATE ACTIONS
echo "INITIATING EMERGENCY ROLLBACK"

# 1. Stop GREEN stack immediately
docker compose -f docker-compose.prod.yml -p family-planner-green down

# 2. Verify BLUE stack is still running
docker compose -f docker-compose.prod.yml -p family-planner-blue ps

# 3. Check traffic is routing to BLUE
curl https://family-planner.example.com/api/health

# 4. Verify data integrity
docker exec family-planner-db-blue psql -U fp_user -d family_planner -c "SELECT count(*) FROM users;"

# 5. Notify stakeholders immediately
# Send: "Deployment rolled back to previous version. Investigating issue."
```

**Recovery Time**: < 5 minutes

### Graceful Rollback (Controlled, when issue found during testing)

```bash
# 1. Stop GREEN stack
docker compose -f docker-compose.prod.yml -p family-planner-green down

# 2. Restore data from pre-deployment backup (if needed)
# Only if data was corrupted by new code
docker exec family-planner-db pg_restore -U fp_user -d family_planner < backup.sql

# 3. Verify BLUE stack is fully functional
./health-check.sh family-planner.example.com 443 https

# 4. Route traffic back to BLUE (usually automatic)
curl https://family-planner.example.com/api/health

# 5. Run full smoke tests
npm run test:smoke
```

**Recovery Time**: 15-30 minutes

### Full System Rollback (if database corrupted)

```bash
# DANGER: Only if required

# 1. Stop all services
docker compose -f docker-compose.prod.yml down

# 2. Find latest known-good backup
ls -lt /opt/family-planner/backups/ | head -1

# 3. Restore PostgreSQL
gunzip < /opt/family-planner/backups/family-planner-backup-20240115_120000-postgres.sql.gz | \
  docker exec -i family-planner-db psql -U fp_user -d family_planner

# 4. Restart all services
docker compose -f docker-compose.prod.yml -p family-planner-blue up -d

# 6. Run data integrity checks
docker exec family-planner-db psql -U fp_user -d family_planner -c "\dt"
```

**Recovery Time**: 1-2 hours (includes restore time)

---

## Post-Deployment

### 24-Hour Review

- [ ] **System Stability**
  - [ ] Zero critical errors in 24 hours
  - [ ] Performance metrics stable
  - [ ] No unexpected restarts
  - [ ] Backup routine executed successfully

- [ ] **User Impact Assessment**
  - [ ] No user-reported issues
  - [ ] Data integrity confirmed
  - [ ] No migration issues
  - [ ] Feature usage as expected

- [ ] **Team Debrief**
  - [ ] War room review meeting held
  - [ ] Lessons learned documented
  - [ ] Issues logged for future improvements
  - [ ] Process improvements identified

### 7-Day Review

- [ ] Deployment stability confirmed
- [ ] Performance baselines established
- [ ] Monitoring alert accuracy validated
- [ ] Any outstanding issues resolved
- [ ] Team training completed

---

## Contact Information

| Role | Name | Phone | Email |
|------|------|-------|-------|
| Incident Commander | TBD | TBD | TBD |
| Platform Lead | TBD | TBD | TBD |
| On-Call | TBD | TBD | TBD |
| Escalation | TBD | TBD | TBD |

**War Room**: [Zoom/Teams Link]
**Monitoring**: [Grafana URL]
**Logs**: [Graylog URL]

---

## Related Documents

- [INFRASTRUCTURE.md](./INFRASTRUCTURE.md) - Full infrastructure guide
- [docker-compose.prod.yml](./docker-compose.prod.yml) - Production stack definition
- [alert-rules.yml](./alert-rules.yml) - Alert configurations
- [health-check.sh](./health-check.sh) - Health check script

---

**Last Updated**: 2024-01-15  
**Version**: 1.0  
**Owner**: DevOps Team
