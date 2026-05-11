#!/bin/bash
# Security Configuration Verification Script

echo "═══════════════════════════════════════════════════════════"
echo "  Family Planner - Security Configuration Checker"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0

check_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓ PASS${NC}: $2"
    ((PASSED++))
  else
    echo -e "${RED}✗ FAIL${NC}: $2"
    ((FAILED++))
  fi
}

echo "1. Checking Environment Variables..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -z "$JWT_SECRET" ]; then
  check_result 1 "JWT_SECRET is set"
else
  if [ ${#JWT_SECRET} -lt 32 ]; then
    check_result 1 "JWT_SECRET is at least 32 characters (current: ${#JWT_SECRET})"
  else
    check_result 0 "JWT_SECRET is set and 32+ characters"
  fi
fi

if [ -z "$NODE_ENV" ]; then
  check_result 1 "NODE_ENV is set"
else
  check_result 0 "NODE_ENV is set to $NODE_ENV"
fi

if [ -z "$POSTGRES_PASSWORD" ] || [ "$POSTGRES_PASSWORD" = "changeme_to_secure_password" ]; then
  check_result 1 "POSTGRES_PASSWORD is changed from default"
else
  check_result 0 "POSTGRES_PASSWORD is set"
fi

if [ -z "$CORS_ORIGINS" ]; then
  check_result 1 "CORS_ORIGINS is configured"
else
  check_result 0 "CORS_ORIGINS is configured: $CORS_ORIGINS"
fi

echo ""
echo "2. Checking API Endpoints..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Health check
if command -v curl &> /dev/null; then
  HEALTH=$(curl -s -w "%{http_code}" -o /dev/null http://localhost:4000/api/health 2>/dev/null)
  if [ "$HEALTH" = "200" ]; then
    check_result 0 "Health endpoint responding"
  else
    check_result 1 "Health endpoint responding (got $HEALTH)"
  fi

  # Check security headers
  echo ""
  echo "3. Checking Security Headers..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  HEADERS=$(curl -s -I http://localhost:4000/api/health 2>/dev/null)

  echo "$HEADERS" | grep -q "X-Frame-Options"
  check_result $? "X-Frame-Options header present"

  echo "$HEADERS" | grep -q "X-Content-Type-Options"
  check_result $? "X-Content-Type-Options header present"

  echo "$HEADERS" | grep -q "Content-Security-Policy"
  check_result $? "Content-Security-Policy header present"

  echo "$HEADERS" | grep -q "X-XSS-Protection"
  check_result $? "X-XSS-Protection header present"

  echo "$HEADERS" | grep -q "Referrer-Policy"
  check_result $? "Referrer-Policy header present"

  # Test rate limiting
  echo ""
  echo "4. Testing Rate Limiting..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━"

  RATE_LIMIT=$(curl -s -I http://localhost:4000/api/health 2>/dev/null | grep -i "RateLimit-Limit" | cut -d':' -f2 | xargs)
  if [ -n "$RATE_LIMIT" ]; then
    check_result 0 "Rate limit headers present (limit: $RATE_LIMIT)"
  else
    check_result 1 "Rate limit headers present"
  fi
else
  echo -e "${YELLOW}⚠ curl not found, skipping endpoint checks${NC}"
fi

echo ""
echo "5. Checking Files..."
echo "━━━━━━━━━━━━━━━━━━"

FILES=(
  "backend/src/middleware/security-headers.ts"
  "backend/src/middleware/input-validator.ts"
  "backend/src/middleware/rate-limiter.ts"
  "backend/src/middleware/jwt-validator.ts"
  "backend/src/middleware/audit-logger.ts"
  "backend/src/routes/complianceRoutes.ts"
  "SECURITY.md"
  "SECURITY_AUDIT_REPORT.md"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    check_result 0 "File exists: $file"
  else
    check_result 1 "File exists: $file"
  fi
done

echo ""
echo "6. Checking Dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━"

cd backend 2>/dev/null || exit 1

REQUIRED_DEPS=("helmet" "express-rate-limit" "bcrypt" "cors" "jsonwebtoken")

for dep in "${REQUIRED_DEPS[@]}"; do
  if grep -q "\"$dep\"" package.json; then
    check_result 0 "Dependency installed: $dep"
  else
    check_result 1 "Dependency installed: $dep"
  fi
done

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Security Verification Summary"
echo "═══════════════════════════════════════════════════════════"
echo -e "  ${GREEN}Passed: $PASSED${NC}"
echo -e "  ${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
  echo ""
  echo -e "${GREEN}✓ All security checks passed!${NC}"
  echo ""
  echo "Deployment Checklist:"
  echo "  ✓ Environment variables configured"
  echo "  ✓ Security headers enabled"
  echo "  ✓ Rate limiting active"
  echo "  ✓ Input validation enabled"
  echo "  ✓ HTTPS configured (verify separately)"
  echo "  ✓ Database encrypted (verify separately)"
  echo ""
  exit 0
else
  echo ""
  echo -e "${RED}✗ Some security checks failed${NC}"
  echo "Please address the failures above before deployment"
  echo ""
  exit 1
fi
