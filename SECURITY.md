## 16. Known Build-Time Dependency Vulnerabilities

> Last reviewed: 2026-05-15  
> Status: **Accepted risk — build-time only, not exposed in the runtime API**

The following high-severity `npm audit` findings cannot be auto-fixed without
breaking changes to the current toolchain. They are **only reachable through
developer tooling** (test runners, build scripts) and are **not bundled into
the production Docker image** (`dist/`).

| Package | CVE / Advisory | Used by | Runtime risk |
|---------|---------------|---------|-------------|
| `tar@6.2.1` | Path traversal via malicious archive | `node-gyp`, `npm pack` | ❌ None — build-time only |
| `glob@7.2.3` | ReDoS (polynomial backtracking) | `rimraf@3`, test tooling | ❌ None — build-time only |
| `rimraf@3.0.2` | Indirect via glob@7 | `mocha`, `jest` cleanup | ❌ None — build-time only |

### Mitigation

```bash
# Attempt safe auto-fix (run in backend/):
npm audit fix

# If the above breaks peer deps, accept the residual risk with:
npm audit fix --force   # review diff carefully before committing
```

If `npm audit fix` cannot resolve these automatically, the risk is confined to
the **CI/CD pipeline and developer workstations**. Production containers built
from the `dist/` output are unaffected because:
- `node_modules` is not copied to the final Docker image stage.
- The vulnerable code paths are only invoked during `npm install` / test runs.

### Action items

- [ ] Pin `glob` to `>=9` and `rimraf` to `>=4` once test-runner compatibility
      is confirmed (track in a follow-up ticket).
- [ ] Enable Dependabot or Renovate to automate future updates.
- [ ] Re-run `npm audit` after every dependency upgrade.

---

# Security Hardening Documentation

## Overview
This document outlines the security measures implemented in the Family Planner application to protect user data and ensure compliance with privacy regulations.

## 1. Authentication & Authorization

### JWT Token Validation
- **Validation at Startup**: JWT_SECRET is validated at server startup to ensure:
  - Secret is set and at least 32 characters long
  - Production environments reject weak/default secrets
- **Token Verification**: All protected endpoints verify JWT signature and expiration
- **Token Audience**: Tokens include audience claim for additional validation

### Token Management
- **Access Tokens**: 24-hour expiration for security
- **Refresh Tokens**: 30-day expiration for user convenience
- **Algorithm**: HS256 (HMAC with SHA-256)

### Password Security
- **Hashing**: Bcrypt with 12 salt rounds
- **Minimum Length**: 8 characters (recommended: 12+ for better security)
- **No Plain-text Storage**: Passwords never stored or logged

## 2. Rate Limiting

### Endpoint-Specific Limits
- **Global Rate Limit**: 1000 requests per 15 minutes per IP
- **Authentication Endpoints**:
  - Login: 5 attempts per hour per IP (fails only)
  - Registration: 10 registrations per 24 hours per IP
- **API Endpoints**: 1000 requests per hour per authenticated user

### Implementation
- Uses `express-rate-limit` middleware
- IP-based tracking for unauthenticated requests
- User ID-based tracking for authenticated requests

## 3. Input Validation & Output Sanitization

### Input Validation
- Pattern matching for common injection attacks:
  - NoSQL injection: `$or`, `$and`, `$where`, `$regex`
  - XSS attempts: `<script>`, `javascript:`, `on*=`
  - SQL injection: `--`, `;`, `*`, `/*`
- Validated on body, query params, and URL parameters
- Request size limits: 10KB for JSON/form data

### Output Sanitization
- HTML entity encoding for all user-provided data
- Prevents XSS attacks through response data
- Recursive sanitization for nested objects and arrays

## 4. Security Headers

### Implemented Headers
- **X-Frame-Options**: `DENY` - Prevents clickjacking
- **X-Content-Type-Options**: `nosniff` - Prevents MIME sniffing
- **X-XSS-Protection**: `1; mode=block` - Legacy XSS protection
- **Content-Security-Policy**: Restricts script sources and embedding
- **Referrer-Policy**: `strict-origin-when-cross-origin` - Limits referrer exposure
- **Permissions-Policy**: Blocks access to device features (geolocation, camera, etc.)
- **HSTS**: Enforced in production (max-age: 1 year)

## 5. CORS Configuration

### Dynamic Configuration
- Read from `CORS_ORIGINS` environment variable
- Supports comma-separated list of allowed origins
- Defaults to localhost for development

### Development
```
CORS_ORIGINS=http://localhost:3000,http://frontend
```

### Production
```
CORS_ORIGINS=https://example.com
```

### Allowed Methods
- GET, POST, PUT, DELETE, PATCH, OPTIONS
- Credentials: Enabled for cookie-based auth

## 6. Data Protection

### Encryption in Transit
- **TLS 1.3 Minimum**: Enforced in production via HSTS
- **HTTPS Only**: Production must use HTTPS

### Encryption at Rest
- **PostgreSQL**: Use with encrypted storage volumes
- **Backups**: Encrypt database backups

### Sensitive Data Handling
- Passwords: Never logged or exposed
- Tokens: Not logged in responses
- API Keys: Stored in environment variables only

## 7. Audit Logging

### Events Captured
- User authentication attempts (success/failure)
- Authorization failures (401, 403)
- Rate limit violations
- Data access patterns

### Log Fields
- Timestamp (ISO 8601)
- User ID (if authenticated)
- IP address
- HTTP method and path
- Response status code
- Duration
- User agent

### Data Retention
- In-memory storage (10,000 log entries maximum)
- For production, integrate with centralized logging (Graylog, ELK, etc.)

## 8. GDPR Compliance

### Data Export (/api/compliance/data/export)
- Allows users to download all their personal data
- JSON format with user profile, recipes, pantry items, and menus
- Requires authentication

### Data Deletion (/api/compliance/data/delete)
- Enables users to request account and data deletion
- Requires confirmation phrase: `DELETE_MY_DATA`
- Transactional deletion to maintain data integrity
- Cascades to all dependent records

### Data Processing
- Clear documentation of data collected and purposes
- User data retained only until account deletion
- No third-party data sharing (Kroger API integration is optional)

## 9. COPPA Compliance (Children's Privacy)

### Consent Status (/api/compliance/coppa/consent-status)
- Tracks account creation date
- Returns parental consent status
- Can be extended for age-verification integration

### Considerations
- If accepting users under 13, implement:
  - Parental consent verification
  - Limited data collection
  - Age-appropriate features

## 10. Container Security

### Dockerfile Hardening
- **Non-root User**: Runs as `nodejs:nodejs` (UID 1001)
- **Minimal Base Image**: `node:20-alpine`
- **Multi-stage Build**: Reduces attack surface
- **Signal Handling**: Uses `dumb-init` for proper shutdown
- **Security Flags**:
  - `--no-audit` for npm (faster builds)
  - `--prefer-offline` for cache optimization
  - Limited Node.js heap size (512MB)

### Runtime Security
- Read-only application code
- Proper file permissions (755)
- Health checks enabled in docker-compose

## 11. Dependency Management

### Security Scanning
```bash
npm audit          # Check for vulnerabilities
npm run test:security  # Comprehensive security tests
```

### Key Dependencies
- **helmet**: Security headers middleware
- **express-rate-limit**: Rate limiting
- **bcrypt**: Password hashing
- **jsonwebtoken**: JWT management
- **cors**: Cross-origin request handling

## 12. Best Practices for Deployment

### Environment Variables (REQUIRED)
```
NODE_ENV=production
JWT_SECRET=<secure-random-32+ chars>
POSTGRES_PASSWORD=<secure-password>
CORS_ORIGINS=https://yourdomain.com
```

### Infrastructure Recommendations
1. **Firewall**: Only allow ports 80, 443, and 22 (SSH)
2. **Network**: Use Docker network for internal communication
3. **Database**: 
   - No exposed PostgreSQL ports outside network
   - Enable encryption at rest
   - Regular backups with encryption
4. **Secrets Management**:
   - Use Docker secrets or environment-specific vaults
   - Never commit `.env` to version control
   - Rotate secrets regularly

### Monitoring
- Enable health checks: `/api/health`
- Monitor rate limit headers in responses
- Track failed authentication attempts
- Alert on unusual API access patterns

## 13. Security Testing

### Manual Testing Checklist
- [ ] Verify JWT validation fails with invalid/expired tokens
- [ ] Test rate limiting on auth endpoints
- [ ] Confirm input validation rejects malicious payloads
- [ ] Check security headers in responses
- [ ] Validate CORS restrictions work correctly
- [ ] Test data export/deletion endpoints
- [ ] Verify audit logging captures events
- [ ] Confirm password hashing with bcrypt

### Automated Testing
```bash
npm run test              # Unit and integration tests
npm run test:coverage     # Coverage report
npm run test:security     # Security audit
```

## 14. Incident Response

### Failed Authentication
- Multiple failed logins trigger rate limiting
- Audit log records all attempts
- Alert system can be configured

### Unauthorized Access
- All 403 errors logged with context
- User session can be invalidated if needed

### Data Breach
- Enable comprehensive audit logging
- Regular backup verification
- Incident response playbook should include:
  - User notification procedures
  - Data forensics
  - Regulatory reporting (GDPR)

## 15. Regular Maintenance

### Weekly
- Monitor security headers (via curl or security scanners)
- Review rate limit metrics

### Monthly
- Run `npm audit` and address findings
- Review audit logs for suspicious patterns
- Check certificate expiration (if using HTTPS)

### Quarterly
- Penetration testing
- Dependency security review
- Update security documentation

## 16. Dependency Vulnerability Status

### Audit Date: 2026-05-16

| Package | Previous Version | Vulnerability | Status | Resolution |
|---|---|---|---|---|
| `bcrypt` | 5.1.1 | Transitive `tar <=7.5.10` path traversal (GHSA-34x7-hfp2-rc4v, GHSA-8qq5-rm4j-mr97, GHSA-83g3-92jg-28cx, GHSA-qffp-2rhf-9h96, GHSA-9ppj-qmqm-q256, GHSA-r6q2-hw4h-h46w) via `@mapbox/node-pre-gyp` | ✅ **RESOLVED** | Upgraded `bcrypt` to `6.0.0` — eliminates `node-pre-gyp` + `tar` dependency chain |
| `glob` | 7.2.3 | Previously flagged; no longer in dependency tree | ✅ **N/A** | Not present in current `package-lock.json` |
| `rimraf` | 3.0.2 | Previously flagged; no longer in dependency tree | ✅ **N/A** | Not present in current `package-lock.json` |

### Current Status
```
npm audit: found 0 vulnerabilities
```

### Production Build Verification
The `Dockerfile` runtime stage uses `npm ci --omit=dev` — bcrypt and all runtime deps are production-clean.
`tar`, `glob`, and `rimraf` are build/dev toolchain packages and are **not bundled** in the Docker runtime image (confirmed via `--omit=dev` flag in Dockerfile runtime stage).

## References
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GDPR Compliance Checklist](https://gdpr.eu/checklist/)
- [COPPA Requirements](https://www.ftc.gov/business-guidance/childrens-privacy)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security](https://nodejs.org/en/docs/guides/security/)
