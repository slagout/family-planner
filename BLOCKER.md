# Blockers Log — Family Planner Production Deployment

*Last updated: 2026-05-10*

---

## BLOCKER-001 — Kroger Token Encryption Not Yet Implemented
**Status**: OPEN
**Phase**: Phase 5 (Kroger Integration)
**Description**: Kroger OAuth tokens are stored in plaintext in the `kroger_tokens` PostgreSQL table. AES-256-GCM encryption must be applied before production launch.
**Required Action**:
1. Provision an encryption key (32 bytes, stored in `ENCRYPTION_KEY` env var or a secrets manager).
2. Implement encrypt/decrypt functions in `backend/src/utils/encryption.ts`.
3. Apply encryption in `krogerAuth.saveTokens()` and decryption in `krogerAuth.getValidTokens()`.
**Priority**: HIGH (security risk if database is compromised).

## BLOCKER-002 — JWK-to-PEM Inline Implementation May Need Hardening
**Status**: OPEN (Low Priority)
**Phase**: Phase 4 (Keycloak Auth)
**Description**: The inline RSA JWK-to-PEM converter in `keycloak-auth.ts` handles standard RSA-2048/4096 keys. If Keycloak is configured with EC keys or PS256 algorithms, it will fail.
**Required Action**: Replace with `jwk-to-pem` npm package if non-RSA algorithms are used.
**Priority**: LOW (standard Keycloak defaults use RS256).

## BLOCKER-003 — LLM Integration Not Yet Implemented
**Status**: OPEN
**Phase**: Not yet assigned
**Description**: The project requirements include LLM integration. No LLM provider, API, or use case was specified in the deployment prompt.
**Required Action**: Clarify LLM provider (OpenAI, Anthropic, local Ollama), use cases (meal planning suggestions, chore generation), and integration points.
**Priority**: MEDIUM (deferred to next sprint).

## BLOCKER-004 — Keycloak Realm Domain Placeholder
**Status**: OPEN
**Phase**: Phase 4 (Keycloak Auth)
**Description**: `keycloak-realm-export.json` contains `CHANGE_ME_DOMAIN` placeholders for redirect URIs and web origins.
**Required Action**: Replace all `CHANGE_ME_DOMAIN` occurrences with the actual production domain before importing the realm into Keycloak.
**Priority**: HIGH (auth will not work without this).

## BLOCKER-005 — Kroger API Credentials Required
**Status**: OPEN
**Phase**: Phase 5 (Kroger Integration)
**Description**: Kroger integration requires developer API credentials from https://developer.kroger.com/
**Required Action**:
1. Register at developer.kroger.com.
2. Create an application and obtain `KROGER_CLIENT_ID` and `KROGER_CLIENT_SECRET`.
3. Set `KROGER_REDIRECT_URI` to `https://<your-domain>/api/kroger/callback`.
**Priority**: HIGH (Kroger features will not work without this).

---

*No phase failures encountered during autonomous execution.*

---

## ✅ RESOLVED — MongoDB Cleanup

**Status**: COMPLETE  
**Resolved**: Phase 2 Sync  
**Summary**: All MongoDB/Mongoose references purged from codebase and documentation. 5 obsolete MongoDB-only files deleted. 12 files updated. Zero MongoDB references remain (excluding the original project instructions file which is preserved as historical context).  
See DECISIONS.md "Cleanup Actions" section for full details.
