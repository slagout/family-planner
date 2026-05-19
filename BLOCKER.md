# Blockers Log — Family Planner Production Deployment

*Last updated: 2026-05-10*

---

## ✅ RESOLVED — BLOCKER-001 — Kroger Token Encryption
**Status**: RESOLVED (2026-05-16)
**Phase**: Phase 5 (Kroger Integration)
**Resolution**:
- Created `backend/src/utils/encryption.ts` — AES-256-GCM encrypt/decrypt using Node.js `crypto` module.
- `krogerAuth.saveTokens()` now encrypts `access_token` and `refresh_token` before INSERT/UPDATE.
- `krogerAuth.getValidTokens()` decrypts tokens after SELECT, before returning to callers.
- Encryption key sourced from `KROGER_TOKEN_ENCRYPTION_KEY` env var (32 bytes / 64 hex chars).
- Generate key: `openssl rand -hex 32` — add to `.env` and Docker Compose secrets.
- Ciphertext format: `base64(IV[12] || AuthTag[16] || Ciphertext)` — tamper-evident via GCM auth tag.
- 5 encryption unit tests covering: round-trip, random IV, missing key, wrong-length key, tampered ciphertext.

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
