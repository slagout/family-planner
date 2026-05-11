# Security Hardening: Deployment Guide

## Overview

This guide walks through deploying the security-hardened Family Planner application. All critical and high-priority security vulnerabilities have been addressed and are production-ready.

---

## Pre-Deployment Checklist

### 1. Generate Secure Secrets

```bash
# Generate JWT_SECRET (32+ characters, cryptographically secure)
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Generate PostgreSQL password (20+ characters)
node -e "console.log('POSTGRES_PASSWORD=' + require('crypto').randomBytes(16).toString('hex'))"
```

**Save these values** - you'll need them for `.env`

### 2. Prepare Environment File

Create `.env` file in project root with:

```env
# Security (CRITICAL - use values from above)
JWT_SECRET=<your-generated-jwt-secret>
POSTGRES_PASSWORD=<your-generated-db-password>
NODE_ENV=production

# Database
POSTGRES_DB=family_planner
POSTGRES_USER=fp_user
PGHOST=db
PGPORT=5432
PGDATABASE=family_planner
PGUSER=fp_user

# CORS - Set to your production domain(s)
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Optional - Only if using Kroger integration
KROGER_CLIENT_ID=<your-kroger-client-id>
KROGER_CLIENT_SECRET=<your-kroger-client-secret>
KROGER_REDIRECT_URI=https://yourdomain.com/api/kroger/callback

# Optional
PORT=4000
```

⚠️ **IMPORTANT**: Never commit `.env` to version control

### 3. Security Verification

Before deploying, run the verification script:

```bash
chmod +x verify-security.sh
./verify-security.sh
```

This checks:
- ✓ Environment variables are set correctly
- ✓ JWT_SECRET meets security requirements
- ✓ All security middleware is in place
- ✓ Dependencies are installed
- ✓ API endpoints responding correctly

---

## Deployment Steps

### Option A: Docker Compose (Recommended for Development)

```bash
# Navigate to project directory
cd family-planner

# Ensure .env file exists with production values
cat .env | grep -E "JWT_SECRET|NODE_ENV|CORS_ORIGINS"

# Start all services
docker compose up -d

# Verify services are running
docker compose ps

# Check logs
docker compose logs -f backend

# Test API is responding
curl http://localhost:4000/api/health
```

### Option B: Production Deployment (Full Stack)

#### Prerequisites
- Ubuntu 20.04+ or similar Linux
- Docker & Docker Compose
- Domain name with DNS configured
- SSL/TLS certificate (Let's Encrypt recommended)

#### Steps

1. **Clone repository**
```bash
git clone https://github.com/slagout/family-planner.git
cd family-planner
```

2. **Create .env file with production values**
```bash
cat > .env << EOF
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
POSTGRES_PASSWORD=$(node -e "console.log(require('crypto').randomBytes(16).toString('hex'))")
NODE_ENV=production
POSTGRES_DB=family_planner
POSTGRES_USER=fp_user
PGHOST=db
PGPORT=5432
PGDATABASE=family_planner
PGUSER=fp_user
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
PORT=4000
EOF
```

3. **Configure HTTPS (Let's Encrypt)**
```bash
# Install certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com
# Follow prompts and agree to terms

# Note certificate path (usually /etc/letsencrypt/live/yourdomain.com/)
```

4. **Set up Nginx reverse proxy**
```bash
# Create nginx config
sudo tee /etc/nginx/sites-available/family-planner << 'EOF'
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers (also set by app)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;

    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/family-planner /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

5. **Start application**
```bash
# Load .env variables
set -a
source .env
set +a

# Start services
docker compose up -d

# Verify
docker compose ps
docker compose logs backend
```

6. **Verify deployment**
```bash
# Test HTTPS
curl -I https://yourdomain.com/api/health

# Check security headers
curl -I https://yourdomain.com/api/health | grep -E "X-Frame|CSP|HSTS"

# Test authentication endpoints
curl -X POST https://yourdomain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"securepass123","displayName":"Test User"}'
```

---

## Post-Deployment Verification

### 1. Health Check

```bash
# Check all services running
curl https://yourdomain.com/api/health

# Expected response:
# {"status":"ok","timestamp":"2024-01-15T10:30:45.123Z"}
```

### 2. Security Headers Verification

```bash
curl -I https://yourdomain.com/api/health

# Verify these headers are present:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
# Content-Security-Policy: ...
# Referrer-Policy: strict-origin-when-cross-origin
# Strict-Transport-Security: max-age=31536000
```

### 3. Rate Limiting Test

```bash
# Attempt 6 logins quickly (should fail on 6th)
for i in {1..6}; do
  curl -X POST https://yourdomain.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"wrongpass"}'
  echo ""
done

# 6th request should return 429: Too Many Requests
```

### 4. Input Validation Test

```bash
# Try NoSQL injection (should fail)
curl -X POST https://yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":{"$or":[{"$where":"true"}]},"password":"test"}'

# Should return 400: Bad Request with "suspicious content" message
```

### 5. Certificate Renewal Setup

```bash
# Certbot automatically renews, but verify:
sudo certbot renew --dry-run

# Set up automatic renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## Monitoring & Maintenance

### Daily Checks

```bash
# Check application running
docker compose ps

# Check recent logs for errors
docker compose logs --tail=50 backend

# Check disk space
df -h

# Check database connectivity
docker compose exec db pg_isready -U fp_user
```

### Weekly Tasks

```bash
# Update security patches
sudo apt-get update && sudo apt-get upgrade -y

# Review rate limit metrics
curl https://yourdomain.com/api/health -I | grep RateLimit

# Verify backups created
ls -lh /path/to/backups/
```

### Monthly Tasks

```bash
# Run dependency audit
cd backend && npm audit --audit-level=moderate

# Review security logs for anomalies
# (Send audit logs to centralized logging system)

# Test data export/deletion endpoints as admin
curl https://yourdomain.com/api/compliance/data/export \
  -H "Authorization: Bearer <admin-token>"
```

### Quarterly Tasks

```bash
# Rotate secrets if needed
# Update .env with new JWT_SECRET

# Run security scanning tools
# (Trivy for container scanning, OWASP ZAP for API testing)

# Review and update security policies
# Test incident response procedures
```

---

## Troubleshooting

### Application Won't Start

```bash
# Check logs
docker compose logs backend

# Verify environment variables
grep "JWT_SECRET\|NODE_ENV" .env

# Ensure JWT_SECRET is 32+ characters
echo $JWT_SECRET | wc -c  # Should be > 32
```

### Slow Performance

```bash
# Check container resource usage
docker stats

# Check database queries
docker compose exec db psql -U fp_user -d family_planner -c "SELECT * FROM pg_stat_activity;"

# Check disk space
df -h /var/lib/docker/volumes/
```

### Connection Issues

```bash
# Test internal communication
docker compose exec backend curl http://db:5432

# Check network
docker network ls
docker network inspect family-planner_default

# Verify CORS configuration
curl -H "Origin: https://yourdomain.com" https://yourdomain.com/api/health -v
```

### Rate Limiting Not Working

```bash
# Verify middleware is loaded
grep -r "rateLimiter\|rate-limiter" backend/src/

# Check rate limiter configuration
cat backend/src/middleware/rate-limiter.ts

# Test with multiple rapid requests
for i in {1..10}; do curl https://yourdomain.com/api/health; done
```

---

## Backup & Recovery

### Automated Backups

```bash
# Create backup script
cat > /opt/backup-family-planner.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backups/family-planner"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker compose exec -T db pg_dump -U fp_user family_planner | \
  gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/db_$TIMESTAMP.sql.gz"
EOF

chmod +x /opt/backup-family-planner.sh

# Schedule daily
(crontab -l 2>/dev/null || true; echo "0 2 * * * /opt/backup-family-planner.sh") | crontab -
```

### Restore from Backup

```bash
# Stop services
docker compose down

# Restore database
docker compose up -d db
sleep 10

# Restore data
gunzip < /backups/family-planner/db_20240115_020000.sql.gz | \
  docker compose exec -T db psql -U fp_user family_planner

# Start all services
docker compose up -d
```

---

## Security Event Response

### Failed Login Attempts

```bash
# Check audit logs for patterns
docker compose logs backend | grep "failed\|401"

# If brute force detected:
# 1. Check if IP-based rate limiting is working
# 2. Consider implementing account lockout
# 3. Notify user of suspicious activity
```

### Unusual API Activity

```bash
# Monitor rate limit violations
docker compose logs backend | grep "RateLimit"

# Check for specific IP address attacks
docker compose logs backend | grep "<IP_ADDRESS>"

# Block malicious IPs at firewall level
sudo ufw insert 1 deny from <IP_ADDRESS>
```

### Suspected Data Breach

```bash
# Review recent audit logs
# Check for unauthorized data exports
# Audit all recent authentication events
# Enable additional logging if needed
```

---

## Rollback Procedure

If issues occur after deployment:

```bash
# 1. Stop current services
docker compose down

# 2. Restore previous database backup
gunzip < /backups/family-planner/db_previous.sql.gz | \
  docker compose exec -T db psql -U fp_user family_planner

# 3. Checkout previous code version
git checkout <previous-commit>

# 4. Restart services
docker compose up -d

# 5. Verify functionality
curl https://yourdomain.com/api/health
```

---

## Support & Documentation

- **Security Details**: See `SECURITY.md`
- **Audit Report**: See `SECURITY_AUDIT_REPORT.md`
- **Implementation Guide**: See `IMPLEMENTATION_SUMMARY.md`
- **Verification**: Run `./verify-security.sh`

---

## Summary

✅ **Deployment Ready**

Your Family Planner application now includes:
- Enterprise-grade security controls
- Comprehensive compliance support (GDPR/COPPA)
- Rate limiting and input validation
- Security headers and HTTPS enforcement
- Audit logging for compliance
- Non-root container execution
- Proper secret management

**Next Steps**:
1. Generate secure secrets
2. Configure environment variables
3. Run verification script
4. Deploy using Docker Compose
5. Set up monitoring and backups
6. Monitor security events

For questions, refer to the security documentation files included in the repository.
