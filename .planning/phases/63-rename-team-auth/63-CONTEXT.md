---
phase: 63
name: Rename + Team Auth
status: ready-for-planning
gathered: 2026-05-16
---

# Phase 63: Rename + Team Auth — Context

<domain>
## Phase Boundary

Phase 63 ships two things atomically: the Memroos → Memroos rename across all user-facing surfaces and source identifiers, and a multi-user RBAC system with JWT-based auth, per-user API keys, and team invitation. Both must land together because Phase 64 (Immutable Audit) requires a `user_id` actor field — if team auth ships without the rename, docs and UI immediately have a naming inconsistency that Phase 64 builds on top of.

### In scope

**Rename (RENAME-01)**
- All UI display strings: page titles, nav labels, sidebar header, error/not-found pages, toast messages that say "Memroos" or "Memroos"
- `package.json` `name` field: root monorepo (`memroos-monorepo` — already correct), `apps/memroos/package.json` (`memroos` — already correct); no changes needed here
- `README.md`, `CONTRIBUTING.md`, `COMMERCIAL-LICENSE.md`, `SECURITY.md` — replace "Memroos" / "Memroos" with "Memroos"
- `docs/` tree — replace all "Memroos" / "Memroos" display references
- Scripts with "memroos" in their name: `scripts/memroos-watchdog.sh`, `scripts/memroos-mcp.sh`, `scripts/install-chatgpt-mcp-launchd.sh` — rename files AND update internal references
- MCP example configs: `examples/mcp/memroos-http.json`, `examples/mcp/memroos-stdio.json` — rename files and update `name`/`description` fields inside
- `package.json` root scripts that reference `memroos` (e.g., `"mcp": "bash scripts/memroos-mcp.sh"`) — update to new script names
- `.mcp.json` and `.cursor/mcp.json` — update any "Memroos" display strings and script paths
- `docker-compose.yml` service labels and comments
- `config/operating-profiles.json` — any "memroos" display labels
- `vercel.json` — any display references
- `.planning/PROJECT.md`, `.planning/STATE.md` — update product name header

**What is NOT renamed**
- `apps/memroos/` directory — keep as-is. Every `@/` import in Next.js resolves through `tsconfig.json` paths, not the directory name. Renaming the directory breaks all imports and CI paths for zero user-visible benefit. The directory stays `apps/memroos/`.
- `MEMROOS_` env var names (e.g., `MEMROOS_MCP_PORT`) — changing env var names is a breaking config change for every operator. Leave them as-is in v1; document in Phase 66 hardening if desired.
- Git history — never rewrite
- External URLs already published (docs, Vercel deployment URLs)
- Internal TypeScript import paths (they resolve to `apps/memroos/src/...` and are not user-visible)
- CSS utility class names (`memroos-*` if any) — check at implementation time; only rename if they appear in user-visible contexts

**Team Auth (TEAM-01, TEAM-02, TEAM-03)**
- New `users` table (separate from `tenants`) storing per-human user credentials
- New `user_roles` table linking user → role (`admin` | `operator` | `reviewer`)
- New `user_api_keys` table for per-user programmatic access (distinct from `tenant_api_keys` which is for the public eval API)
- New `team_invitations` table for the invite-link flow
- JWT access token (15-minute lifetime) + refresh token (7-day lifetime, stored in `httpOnly` `SameSite=Lax` cookie)
- Login endpoint: `POST /api/auth/login` — returns access token in response body, sets refresh token cookie
- Refresh endpoint: `POST /api/auth/refresh` — reads refresh cookie, issues new access token
- Logout endpoint: `POST /api/auth/logout` — clears refresh cookie
- Team invitation: **invite-link based** (not email-based) for v1 — admin generates a signed single-use token; invitee clicks the link, sets a password, is assigned a role
- `GET /api/auth/invite/[token]` — validate invite token; `POST /api/auth/invite/[token]` — complete registration
- Role enforcement: Next.js middleware at `apps/memroos/src/middleware.ts` — extend the existing middleware (currently handles rate limiting for public API) to also check JWT on all non-public routes; route group to role mapping in a single config object
- The existing `authorizeRegistryWrite` pattern (per-agent API keys on REST endpoints) is **extended, not replaced** — it handles agent-to-memroos auth; the new JWT system handles human-to-memroos auth. They are separate concerns on separate routes.
- Operator approval queue (TEAM-03): Phase 63 wires user identity into the existing SEAL proposal approval UI — `seal_proposal_decisions.operator` column currently stores a string; Phase 63 ensures it stores an authenticated `user_id`

</domain>

<decisions>
## Implementation Decisions

### Decision 1 — Rename in one commit

All rename changes ship in a single commit. Staged renaming (UI first, then docs, then scripts) creates a window where UI says "Memroos" but README still says "Memroos", which confuses contributors and external users reading the OSS repo. One commit, atomic, with a clear message: `feat: rename Memroos → Memroos (RENAME-01)`.

Implementation order within that commit:
1. Script files renamed first (so `package.json` script references can be updated in the same pass)
2. MCP example configs renamed
3. Source files with display strings updated
4. Docs updated
5. Root config files (`.mcp.json`, `docker-compose.yml`, `vercel.json`) updated

### Decision 2 — New `users` table, NOT extending `tenants`

The `tenants` table (from Phase 62) represents companies/organizations that use the public eval API. Human team members are a different concept — one tenant can have many users; users have passwords and sessions; tenants have API keys and scopes. Mixing them creates a schema that fights v3's compliance posture (audit log needs `user_id` as a distinct actor from `tenant_id`).

Schema:
```sql
CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,           -- nanoid
  email        TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,             -- bcrypt, cost 12
  tenant_id    TEXT NOT NULL DEFAULT 'default-tenant'
               REFERENCES tenants(id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  last_login_at TEXT
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role    TEXT NOT NULL CHECK(role IN ('admin','operator','reviewer')),
  PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS user_api_keys (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key_hash     TEXT NOT NULL UNIQUE,
  label        TEXT NOT NULL DEFAULT '',
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  last_used_at TEXT,
  revoked_at   TEXT
);
CREATE INDEX IF NOT EXISTS uak_user ON user_api_keys(user_id, revoked_at);
CREATE INDEX IF NOT EXISTS uak_hash ON user_api_keys(key_hash);

CREATE TABLE IF NOT EXISTS user_refresh_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS urt_user ON user_refresh_tokens(user_id, revoked_at);
CREATE INDEX IF NOT EXISTS urt_hash ON user_refresh_tokens(token_hash);

CREATE TABLE IF NOT EXISTS team_invitations (
  id          TEXT PRIMARY KEY,
  token_hash  TEXT NOT NULL UNIQUE,
  role        TEXT NOT NULL CHECK(role IN ('admin','operator','reviewer')),
  invited_by  TEXT NOT NULL REFERENCES users(id),
  email_hint  TEXT,             -- optional; shown on the invite acceptance page
  used_at     TEXT,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS inv_token ON team_invitations(token_hash, used_at);
```

Seed: on first startup, if no users exist, create a default admin user from `MEMROOS_ADMIN_EMAIL` + `MEMROOS_ADMIN_PASSWORD` env vars. If vars are absent, print a first-run warning and require the operator to set them before the UI loads.

### Decision 3 — JWT strategy: short-lived access token + httpOnly refresh cookie

Access token: HS256 JWT, 15-minute lifetime, signed with `MEMROOS_JWT_SECRET` env var. Payload: `{ sub: userId, role: string[], iat, exp }`. Returned in response body on `/api/auth/login` and `/api/auth/refresh`.

Refresh token: 7-day lifetime, stored as a SHA-256 hash in `user_refresh_tokens`. The raw token is set as an `httpOnly; SameSite=Lax; Secure` cookie named `memroos_refresh`. The refresh endpoint reads the cookie, verifies the hash against the DB, checks expiry and `revoked_at`, issues a new access token. Refresh token rotation: each `/api/auth/refresh` call revokes the old token and inserts a new one (sliding window).

Rationale: httpOnly cookie for the refresh token means XSS cannot exfiltrate it. Short-lived access token limits blast radius if a token leaks. This is the established pattern for single-page apps that also need API access.

JWT library: `jose` — already a common Next.js ecosystem choice, pure ESM, no native bindings required. Add to `apps/memroos/package.json` dependencies.

### Decision 4 — Role enforcement via middleware, not per-handler checks

All protected routes in one place. The `apps/memroos/src/middleware.ts` file (currently handling rate limiting for `/api/public/v1/*`) is extended to:

1. For `/api/public/v1/*` routes — existing tenant API key check (unchanged)
2. For all other `/api/*` routes (except `/api/auth/*`) — require a valid JWT access token in `Authorization: Bearer <token>` header
3. For UI routes (non-API) — redirect to `/login` if no valid token in cookie (or a secondary `memroos_access` cookie set alongside the refresh cookie for SSR)
4. Role-to-route mapping enforced in middleware:

```typescript
const ROLE_ROUTES: Record<string, string[]> = {
  // routes that require at least 'reviewer'
  reviewer: ['/api/seal', '/api/evals', '/api/audit'],
  // routes that require at least 'operator'
  operator: ['/api/seal/proposals/*/approve', '/api/agents/*/dispatch'],
  // routes that require 'admin'
  admin: ['/api/users', '/api/invitations'],
};
```

Reviewer can read everything. Operator can read + approve/run. Admin can do everything including user management.

### Decision 5 — Invite-link based, not email-based, for v1

Email delivery requires an SMTP/SendGrid integration that is not in scope for Phase 63. Invite-link flow:
- Admin calls `POST /api/auth/invite` (body: `{ role, email_hint? }`) → returns `{ inviteUrl: string }` with a signed token
- Admin copies the URL and sends it themselves (Slack, email, etc.)
- Invitee opens `https://<host>/invite/[token]`, sees a form (email + password), submits `POST /api/auth/invite/[token]`
- On success: user created, role assigned, invite marked used, redirect to `/login`
- Token expiry: 72 hours. Single-use (used_at set on consumption).

Email delivery deferred to Phase 66 (self-hosted hardening adds SMTP config).

### Decision 6 — `authorizeRegistryWrite` is extended, not replaced

`apps/memroos/src/lib/operator-auth.ts` currently validates per-agent API keys for registry write operations. Phase 63 adds a parallel `authenticateUser(req)` helper in `apps/memroos/src/lib/user-auth.ts` that validates JWT access tokens and returns `{ userId, roles }`. These are separate code paths:

- Agent → Memroos (REST heartbeat, skill report, etc.): still uses `authorizeRegistryWrite` / per-agent `agent_api_keys`
- Human → Memroos UI API calls: uses JWT access token
- Human → Memroos programmatic access (CI scripts, etc.): uses per-user API key via `user_api_keys`, resolved to a `userId` and `roles` by the same `authenticateUser` helper (it checks both Bearer JWT and Bearer user-API-key)

Phase 64 (Audit) will call `authenticateUser` to populate the `actor` field on every audit entry.

### Decision 7 — Sidebar: add Team/Settings nav item; no structural change

The sidebar currently has 15 nav items. Phase 63 adds two new items:
- `{ href: "/team", label: "Team", description: "Users and invitations", icon: Users }` — admin-only visibility
- `{ href: "/settings/api-keys", label: "API Keys", description: "Per-user API keys", icon: Key }` — all roles

The sidebar does not get per-role conditional rendering in Phase 63 — that complexity (hide nav items based on role) is deferred. Admin-only pages simply return 403 from the API if a non-admin hits them; the nav item is visible but the page shows an access-denied state. Full nav-item visibility gating is Phase 66.

</decisions>

<code_context>
## Existing Code Insights

- `apps/memroos/src/lib/db-schema.ts` — `initSchema` is the CRITICAL symbol all DB routes flow through. Phase 63 adds 5 new tables (`users`, `user_roles`, `user_api_keys`, `user_refresh_tokens`, `team_invitations`) using the same `CREATE TABLE IF NOT EXISTS` pattern established in Phases 57–62. Run `gitnexus_impact({target: "initSchema", direction: "upstream"})` before editing.
- `apps/memroos/src/lib/public-api/auth.ts` — existing `authenticateTenantRequest()` using SHA-256 key hash lookup. Phase 63's `authenticateUser()` in `user-auth.ts` follows the same hash pattern for user API keys, but adds a JWT verification branch.
- `apps/memroos/src/middleware.ts` — already exists (Phase 62 added rate limiting). Phase 63 extends it; do NOT create a new middleware file. Read it before editing.
- `apps/memroos/src/lib/operator-auth.ts` — `authorizeRegistryWrite` handles agent API key auth. Phase 63 does not touch this file.
- `apps/memroos/src/components/layout/sidebar.tsx` — `KangarooMark` brand mark and "MemroOS" display strings are already correct. The sidebar header shows "MemroOS" / "MemroOS" — no rename needed here. New nav items for Team and API Keys needed.
- `apps/memroos/src/app/not-found.tsx` and `apps/memroos/src/app/error.tsx` — check for "Memroos" references.
- `scripts/memroos-mcp.sh` → rename to `scripts/memroos-mcp.sh`; update `package.json` `mcp` and `mcp:http` scripts
- `scripts/memroos-watchdog.sh` → rename to `scripts/memroos-watchdog.sh`; update any launchd plist references
- `scripts/install-chatgpt-mcp-launchd.sh` — check internal references to "memroos" or "Memroos"
- `examples/mcp/memroos-http.json` → rename to `examples/mcp/memroos-http.json`
- `examples/mcp/memroos-stdio.json` → rename to `examples/mcp/memroos-stdio.json`
- `package.json` root `mcp`/`mcp:http` scripts reference `scripts/memroos-mcp.sh` — must update after rename
- `.mcp.json` and `.cursor/mcp.json` — reference script paths and potentially display names
- `vercel.json` — likely has project name or build config referencing memroos
- `config/operating-profiles.json` — may have "Memroos" in display labels
- `docker-compose.yml` — service name is likely `memroos`; check whether changing it breaks any `docker-compose exec memroos` references in scripts; if so, add a `container_name: memroos` alias rather than renaming the service key
- `bcrypt` is NOT a current dependency. Use `bcryptjs` (pure JS, no native bindings) or add `bcrypt` as a new dependency. Check `apps/memroos/package.json` before deciding. `jose` for JWT is also a new dependency — add both.
- New pages needed: `apps/memroos/src/app/login/page.tsx`, `apps/memroos/src/app/invite/[token]/page.tsx`, `apps/memroos/src/app/team/page.tsx`, `apps/memroos/src/app/settings/api-keys/page.tsx`
- `apps/memroos/src/app/api/auth/` route directory does not exist yet — create it

</code_context>

<deferred>
## Deferred to Later Phases

- Email delivery for invitations (Phase 66 adds SMTP config)
- Per-role nav item visibility hiding in sidebar (Phase 66)
- Password reset flow (Phase 66)
- OAuth / SSO login (post-v3)
- `MEMROOS_` env var rename (Phase 66 hardening, if desired)
- Changing `apps/memroos/` directory name (never — cost/benefit is wrong)
- Full audit log actor enforcement on all existing endpoints (Phase 64 owns this; Phase 63 only wires user identity into SEAL proposal decisions)
- Docker compose service key rename from `memroos` to `memroos` (evaluate in Phase 66 if needed; breaking change for operators with existing compose overrides)
</deferred>

<open_questions>
## Open Questions — Resolved

1. **Rename in one commit or staged?** — One commit. See Decision 1.
2. **Rename `apps/memroos/` directory?** — No. See Decision 1 rationale.
3. **JWT vs session-based?** — JWT with httpOnly refresh cookie. See Decision 3.
4. **Users table vs extending tenants?** — Separate `users` table. See Decision 2.
5. **Role enforcement location?** — Middleware. See Decision 4.
6. **Invite flow: email or link?** — Invite link for v1. See Decision 5.
7. **`authorizeRegistryWrite` replaced or extended?** — Extended (kept). See Decision 6.
8. **`bcrypt` dependency?** — `bcryptjs` (pure JS). Verify against current deps before adding.
</open_questions>
