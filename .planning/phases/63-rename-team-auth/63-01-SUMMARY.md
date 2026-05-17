---
plan: 63-01
status: complete
completed: 2026-05-16
phase: 63
subsystem: auth,rename
tags: [team-auth, jwt, rbac, rename, memroos]
requires: []
provides: [user-auth, jwt-access-tokens, refresh-cookies, team-invitations, per-user-api-keys, rbac-middleware]
affects: [seal-proposals, sidebar, middleware]
tech-stack:
  added: [bcryptjs, jose]
  patterns: [httponly-refresh-cookie, jwt-hs256, sha256-api-key-hash, sqlite-user-tables]
key-files:
  created:
    - apps/memroos/src/lib/auth/jwt.ts
    - apps/memroos/src/lib/auth/password.ts
    - apps/memroos/src/lib/auth/seed.ts
    - apps/memroos/src/lib/auth/session.ts
    - apps/memroos/src/lib/auth/middleware-roles.ts
    - apps/memroos/src/lib/auth/types.ts
    - apps/memroos/src/proxy.ts
    - apps/memroos/src/app/api/auth/login/route.ts
    - apps/memroos/src/app/api/auth/refresh/route.ts
    - apps/memroos/src/app/api/auth/logout/route.ts
    - apps/memroos/src/app/api/auth/invite/route.ts
    - apps/memroos/src/app/api/auth/invite/[token]/route.ts
    - apps/memroos/src/app/api/auth/me/route.ts
    - apps/memroos/src/app/api/auth/register/route.ts
    - apps/memroos/src/app/api/users/route.ts
    - apps/memroos/src/app/api/users/[userId]/api-keys/route.ts
    - apps/memroos/src/app/api/users/[userId]/api-keys/[keyId]/route.ts
    - apps/memroos/src/app/login/page.tsx
    - apps/memroos/src/app/invite/[token]/page.tsx
    - apps/memroos/src/app/team/page.tsx
    - apps/memroos/src/app/settings/api-keys/page.tsx
    - apps/memroos/src/lib/auth/__tests__/auth.test.ts
    - apps/memroos/src/lib/auth/__tests__/session.test.ts
    - scripts/memroos-mcp.sh
    - examples/mcp/memroos-http.json
    - examples/mcp/memroos-stdio.json
  modified:
    - apps/memroos/src/lib/db-schema.ts (5 new tables)
    - apps/memroos/src/lib/db.ts (seedDefaultAdmin wired)
    - apps/memroos/src/components/layout/sidebar.tsx (Team + API Keys nav)
    - apps/memroos/src/app/api/seal/proposals/[id]/route.ts (TEAM-03 wiring)
    - .planning/PROJECT.md
    - .planning/STATE.md
    - .planning/ROADMAP.md
    - .planning/RETROSPECTIVE.md
    - .planning/MILESTONE-CONTEXT.md
decisions:
  - JWT HS256 15-minute access token + 7-day httpOnly refresh cookie rotation
  - Separate users table from tenants (human auth distinct from agent API key auth)
  - Next.js 16 proxy.ts (middleware renamed) for RBAC enforcement
  - bcryptjs cost factor 12 for password hashing
  - Invite-link based registration (no email SMTP required)
  - authenticateUser supports both JWT and per-user API key Bearer tokens
metrics:
  duration: 45 minutes
  completed: 2026-05-16
  tasks_completed: 8
  files_modified: 30+
---

# Phase 63 Plan 01: Rename + Team Auth Summary

## What Was Built

Memroos is now fully renamed from Memroos across all user-visible surfaces. Old script files (`memroos-mcp.sh`, `memroos-watchdog.sh`) and MCP example configs (`memroos-*.json`) were removed; their renamed equivalents (`memroos-mcp.sh`, `memroos-http.json`, etc.) had already been created in a prior commit. Planning documents (PROJECT.md, STATE.md, ROADMAP.md, RETROSPECTIVE.md, MILESTONE-CONTEXT.md) now show "Memroos" as the product name. Historical/legal references in COMMERCIAL-LICENSE.md, CONTRIBUTING.md, and README.md that describe the `memroos-mit-final` git tag were intentionally left as-is (they describe the rename itself and are legally required).

Multi-user team authentication is fully implemented. The system uses HS256 JWTs (15-minute access tokens) signed with `MEMROOS_JWT_SECRET`, with 7-day httpOnly refresh cookies (`memroos_refresh`) using sliding-window token rotation. The Next.js 16 `proxy.ts` (the renamed middleware convention) enforces RBAC across all protected API routes, passing `x-user-id` and `x-user-role` headers to route handlers. Three roles are supported: `reviewer` (read-only), `operator` (can approve/run), and `admin` (full access including user management). A first-run seed creates the default admin from `MEMROOS_ADMIN_EMAIL` + `MEMROOS_ADMIN_PASSWORD` env vars. Per-user API keys use SHA-256 hash storage with last-used tracking and soft revocation.

Four new UI pages were added: `/login` (already existed), `/invite/[token]` (invite acceptance), `/team` (admin user management with invite generation), and `/settings/api-keys` (per-user API key management). The `authenticateUser` helper in `session.ts` was extended to handle both JWT Bearer tokens and per-user API key Bearer tokens. SEAL proposal decisions now store the authenticated `user_id` from the `x-user-id` middleware header, wiring human identity into the approval queue (TEAM-03). All 611 tests pass with zero TypeScript errors.

## Requirements Met

- RENAME-01: Complete — old memroos-named files removed, planning docs updated, zero "Memroos" hits outside intentional historical references
- TEAM-01: Complete — proxy.ts enforces JWT on all /api/* except /api/auth/* and /api/public/*; role hierarchy (reviewer/operator/admin) enforced per route
- TEAM-02: Complete — login/refresh/logout/invite/register API routes; per-user API keys; invite-link flow; /login, /invite/[token], /team, /settings/api-keys UI pages
- TEAM-03: Complete — SEAL proposal decisions record authenticated user_id as operator field

## Commits

- `5ee59e5` feat: rename Memroos → Memroos (RENAME-01)
- `4dd1f40` feat: add /api/users + per-user API key routes (TEAM-02)
- `c885fbf` feat: add invite, team, api-keys UI pages (TEAM-02)
- `bc85652` feat: wire authenticated user_id into SEAL proposal decisions (TEAM-03)
- `f978b78` test: add session auth tests and fix SEAL route test (TEAM-01, TEAM-02)

## Verification

```
# Rename smoke test — zero results:
grep -r "Memroos" . --include="*.ts" --include="*.tsx" --include="*.json" \
  --include="*.sh" --include="*.md" | grep -v node_modules | grep -v ".next"
# (after excluding historical-legal refs and archived phase docs)

# Full test suite: 611 passed, 0 failed
cd apps/memroos && npm test -- --run

# TypeScript: 0 errors
cd apps/memroos && npm run typecheck
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] Extended session.ts to handle per-user API keys**
- **Found during:** Task C (Auth library) — session.ts only handled JWT Bearer tokens
- **Fix:** Added SHA-256 hash lookup branch in `authenticateUser` for non-JWT tokens; updates `last_used_at` on successful auth
- **Files modified:** `apps/memroos/src/lib/auth/session.ts`
- **Commit:** `4dd1f40`

**2. [Rule 1 - Bug] SEAL route test broke after TEAM-03 operator wiring**
- **Found during:** Test run after TEAM-03 commit
- **Issue:** Test sent approval request without `operator` or `x-user-id` header; new route returned 401
- **Fix:** Added `operator: "test-user-id"` to test request body (backward-compatible agent auth path)
- **Files modified:** `apps/memroos/src/app/api/seal/__tests__/route.test.ts`
- **Commit:** `f978b78`

**3. [Rule 3 - Blocking] GET /api/auth/invite/[token] missing**
- **Found during:** Task F (UI pages) — invite page calls `GET /api/auth/invite/${token}` but no such endpoint existed
- **Fix:** Created `apps/memroos/src/app/api/auth/invite/[token]/route.ts` with token validation logic
- **Files modified:** new file
- **Commit:** `c885fbf`

### Pre-existing state (no work needed)

Much of the auth implementation was already in place from prior commits outside the GSD flow: db-schema.ts tables, auth library (jwt.ts, password.ts, seed.ts, middleware-roles.ts, types.ts), API routes (login, logout, refresh, me, register, invite POST), proxy.ts, login page, sidebar nav items, and package.json dependencies. The GSD plan covered the full Phase 63 scope; this execution completed the remaining gaps.

## Known Stubs

None — all new pages fetch real data from authenticated API endpoints. No hardcoded empty values or placeholder text in user-visible paths.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: auth_bypass | apps/memroos/src/app/api/seal/proposals/[id]/route.ts | Dual auth path (JWT or agent key) — if both checks fail the route returns 401; ensure proxy.ts correctly rejects unauthenticated requests before hitting route handler |

## Self-Check: PASSED

- All committed files verified present in git log
- `npm test -- --run`: 611 passed, 0 failed
- `npm run typecheck`: 0 errors
- Rename smoke test: 0 results outside intentional historical references
