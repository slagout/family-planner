# Autonomous Decision Log — Family Planner Production Setup

All decisions made autonomously during the production deployment setup phase.

---

## Decision 001 — Database Technology
**Decision**: PostgreSQL exclusively, using raw `pg` driver with parameterized SQL.
**Rationale**: Non-negotiable per project constraints. MongoDB provides flexible schemas but lacks ACID transaction guarantees needed for point ledger and financial-grade audit trails.
**Alternative Considered**: MongoDB with transactions (rejected — per constraints).

## Decision 002 — MongoDB Artifact Removal
**Decision**: Deleted `backup-mongodb.sh`, `restore-mongodb.sh`, `migrate-to-mongodb.ts`, `verify-migration.ts`, `src/mongodb-schema.ts`, `indexeddb-schema.ts`, and `setup-audit-logging.ts`.
**Rationale**: These files represent a deprecated migration path to MongoDB that contradicts the PostgreSQL-only mandate. They pose confusion risk and contain outdated schema definitions.
**Files Removed**: 7 files totaling ~1,559 lines of MongoDB-specific code.

## Decision 003 — conflict-resolver.ts Retained
**Decision**: `backend/conflict-resolver.ts` was kept. It has no MongoDB imports; it uses `uuid` and the browser `fetch` API for offline-first sync queue management.
**Rationale**: The file is useful for offline-first client-side sync and contains no MongoDB driver code.

## Decision 004 — Immutable Schema via PostgreSQL Triggers
**Decision**: Enforced immutability on `chore_completions`, `point_ledger`, `reward_redemptions`, and `audit_log` via `BEFORE UPDATE` and `BEFORE DELETE` triggers that raise exceptions.
**Rationale**: Database-level enforcement is more reliable than application-layer guards. Prevents accidental mutations even if application code has bugs.
**Alternative Considered**: Application-only guards (rejected — database triggers are the correct layer).

## Decision 005 — Keycloak JWKS Public Key Caching
**Decision**: Implemented a 5-minute in-memory JWKS cache to avoid hitting Keycloak on every request.
**Rationale**: Reduces latency and avoids Keycloak rate limiting. 5-minute TTL balances freshness (key rotation) with performance.
**Alternative Considered**: No cache (rejected — too much latency), Redis cache (rejected — unnecessary dependency for this scale).

## Decision 006 — Kroger Token Storage
**Decision**: Tokens stored in PostgreSQL `kroger_tokens` table with a TODO comment for AES-256-GCM encryption.
**Rationale**: Centralized storage enables multi-device access. Encryption key management requires infrastructure not yet provisioned (KMS or Vault). Added TODO to ensure this is addressed before production launch.
**Security Note**: `ENCRYPTION_KEY` env var must be set and tokens encrypted before going to production.

## Decision 007 — JWK to PEM Conversion (Inline Implementation)
**Decision**: Implemented a basic RSA JWK-to-PEM converter inline instead of using `jwk-to-pem` npm package.
**Rationale**: Reduces dependencies per project constraints (prefer zero-dependency).
**Alternative Considered**: `jwk-to-pem` package (>10k stars, valid choice). Recommend switching if edge cases arise with non-RSA-2048 keys.

## Decision 008 — Repository Pattern
**Decision**: Created repository layer (`userRepo`, `choreRepo`, `childRepo`, `rewardRepo`) for all database access.
**Rationale**: Separates SQL from business logic, enables mocking in tests, and enforces consistent parameterized query usage.

## Decision 009 — `withTransaction` Helper
**Decision**: Added `withTransaction` helper to `db.ts` for atomic multi-table operations.
**Rationale**: Chore completion requires atomic insert to `chore_completions` + `point_ledger` + `audit_log` + update to `chores.status`. Without a transaction helper, this pattern would be duplicated across services.
