# Project Instructions — Family Planner

## Autonomy
- Work autonomously. Do not ask for confirmation between steps.
- Make reasonable assumptions and document them in DECISIONS.md.
- Use placeholders (TODO comments) for values you don't have (API keys, IPs, passwords).

## Tech Stack (Non-Negotiable)
- Backend: Node.js + Express + TypeScript
- Database: PostgreSQL ONLY (immutable pattern with append-only tables)
- Auth: Keycloak (OAuth 2.0 / OIDC)
- Frontend: React + Vite + TypeScript
- Containerization: Docker Compose
- No MongoDB. No Mongoose. No SQLite.

## Code Style
- Raw parameterized SQL via pg driver
- snake_case DB columns, camelCase TypeScript
- Every mutation on an append-only table must go through a repository function
- Every API route must have input validation (zod or joi)
- Every new file gets a header comment explaining its purpose

## When Stuck
- Try the simplest fix first
- If 3 attempts fail on the same problem, skip it and add a BLOCKER.md entry
- Never halt the entire task for one blocked step