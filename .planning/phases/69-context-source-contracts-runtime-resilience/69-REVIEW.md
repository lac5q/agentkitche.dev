---
phase: 69-context-source-contracts-runtime-resilience
reviewed: 2026-05-17T00:00:00Z
depth: standard
files_reviewed: 63
files_reviewed_list:
  - apps/memroos/src/app/api/a2a/agents/register/route.ts
  - apps/memroos/src/app/api/admin/compliance/route.ts
  - apps/memroos/src/app/api/agents/register/route.ts
  - apps/memroos/src/app/api/audit-log/route.ts
  - apps/memroos/src/app/api/audit/export/route.ts
  - apps/memroos/src/app/api/audit/route.ts
  - apps/memroos/src/app/api/auth/invite/[token]/route.ts
  - apps/memroos/src/app/api/auth/invite/route.ts
  - apps/memroos/src/app/api/auth/login/route.ts
  - apps/memroos/src/app/api/auth/logout/route.ts
  - apps/memroos/src/app/api/auth/me/route.ts
  - apps/memroos/src/app/api/auth/refresh/route.ts
  - apps/memroos/src/app/api/auth/register/route.ts
  - apps/memroos/src/app/api/context/health/route.ts
  - apps/memroos/src/app/api/escalations/[id]/resolve/route.ts
  - apps/memroos/src/app/api/escalations/route.ts
  - apps/memroos/src/app/api/finance-reconciliation/route.ts
  - apps/memroos/src/app/api/onboarding/invite/route.ts
  - apps/memroos/src/app/api/onboarding/register/route.ts
  - apps/memroos/src/app/api/seal/audit/route.ts
  - apps/memroos/src/app/api/seal/proposals/[id]/route.ts
  - apps/memroos/src/app/api/seal/proposals/route.ts
  - apps/memroos/src/app/audit/page.tsx
  - apps/memroos/src/app/escalations/page.tsx
  - apps/memroos/src/app/invite/[token]/page.tsx
  - apps/memroos/src/app/login/page.tsx
  - apps/memroos/src/app/register/page.tsx
  - apps/memroos/src/app/seal/page.tsx
  - apps/memroos/src/app/settings/compliance/page.tsx
  - apps/memroos/src/app/team/page.tsx
  - apps/memroos/src/components/library/context-sources-panel.tsx
  - apps/memroos/src/components/memroos/audit-log-panel.tsx
  - apps/memroos/src/components/seal/approval-queue-panel.tsx
  - apps/memroos/src/components/seal/audit-log-panel.tsx
  - apps/memroos/src/lib/agent-runtime/middleware.ts
  - apps/memroos/src/lib/audit.ts
  - apps/memroos/src/lib/audit/event-types.ts
  - apps/memroos/src/lib/audit/query.ts
  - apps/memroos/src/lib/audit/schema.ts
  - apps/memroos/src/lib/audit/sla.ts
  - apps/memroos/src/lib/audit/write.ts
  - apps/memroos/src/lib/auth/jwt.ts
  - apps/memroos/src/lib/auth/middleware-roles.ts
  - apps/memroos/src/lib/auth/password.ts
  - apps/memroos/src/lib/auth/rate-limit.ts
  - apps/memroos/src/lib/auth/seed.ts
  - apps/memroos/src/lib/auth/session.ts
  - apps/memroos/src/lib/auth/types.ts
  - apps/memroos/src/lib/compliance/data-residency.ts
  - apps/memroos/src/lib/context-sources.ts
  - apps/memroos/src/lib/finance-reconciliation/index.ts
  - apps/memroos/src/lib/finance-reconciliation/terminology.ts
  - apps/memroos/src/lib/operator-auth.ts
  - apps/memroos/src/lib/public-api/auth.ts
  - apps/memroos/src/lib/seal/apply.ts
  - apps/memroos/src/lib/seal/audit.ts
  - apps/memroos/src/lib/seal/proposal-registry.ts
  - apps/memroos/src/lib/seal/reflection.ts
  - apps/memroos/src/lib/seal/rescore.ts
  - apps/memroos/src/lib/seal/sdk-eval-service.ts
  - apps/memroos/src/lib/seal/service.ts
  - apps/memroos/src/lib/seal/types.ts
  - apps/memroos/src/proxy.ts
findings:
  critical: 8
  warning: 9
  info: 4
  total: 21
status: issues_found
---

# Phase 69: Code Review Report

**Reviewed:** 2026-05-17T00:00:00Z
**Depth:** standard
**Files Reviewed:** 63
**Status:** issues_found

## Summary

This review covers the Memroos v3.0/v3.1 security-sensitive surface: JWT auth, RBAC, invite-only registration, immutable audit log, HIL escalations, compliance data-residency controls, SEAL proposal lifecycle, and the public eval API.

The auth primitives (JWT signing, bcrypt hashing, refresh token rotation) are sound. SQL injection is systematically prevented via parameterized queries. The immutable audit log design is intentional and the dual-write shim is clearly annotated.

However, **eight critical issues** are present — four of them represent direct authentication bypasses or unauthorized access paths that can be exploited today without any special conditions. The remaining four are data-loss or integrity risks under reachable conditions.

---

## Critical Issues

### CR-01: Access token stored in non-HttpOnly cookie — XSS fully bypasses auth

**File:** `apps/memroos/src/app/login/page.tsx:30`
**Issue:** After a successful login the client-side code writes the access token to a plain JavaScript-accessible cookie:
```js
document.cookie = `access_token=${data.accessToken}; SameSite=Lax; Path=/`;
```
`HttpOnly` is deliberately omitted so the middleware can read it for SSR. Any XSS vector anywhere in the application — including third-party scripts or injected content — can read `document.cookie`, extract the access token, and impersonate the user. Because the token is a 15-minute JWT with role embedded, an attacker who lifts it can call any privileged API route.

The comment "Store access token in a non-httpOnly cookie for SSR reads by middleware" is the rationale, but Next.js middleware can read `HttpOnly` cookies via `req.cookies` — there is no technical need for the cookie to be readable by JavaScript.

**Fix:** Add `HttpOnly` to the `document.cookie` assignment. Since `document.cookie` cannot set HttpOnly from the browser, the access token must be set by the server in the `/api/auth/login` response alongside the refresh token cookie:
```typescript
// In login route.ts, add a second Set-Cookie for access_token:
const accessCookieValue = [
  `access_token=${accessToken}`,
  'HttpOnly',
  'SameSite=Lax',
  isProd ? 'Secure' : '',
  'Path=/',
  'Max-Age=900',
].filter(Boolean).join('; ');
// Return both cookies in the response headers (use Set-Cookie array or comma separation)
```
Remove the `document.cookie` assignment from `login/page.tsx` entirely.

---

### CR-02: `/api/audit-log` route has no authentication — any unauthenticated caller reads audit data

**File:** `apps/memroos/src/app/api/audit-log/route.ts:14-31`
**Issue:** The route handler calls `getDb()` and returns audit log rows with zero authentication. There is no call to `authenticateUser`, no call to `requireRole`, and no middleware protection listed for this path in `proxy.ts`. Any unauthenticated HTTP client can GET `/api/audit-log` and receive up to 100 audit entries including actor IDs, action types, targets, and severity levels.

**Fix:**
```typescript
export async function GET(req: NextRequest) {
  const session = await authenticateUser(req);
  if (!session) return Response.json({ error: 'authentication required' }, { status: 401 });
  // ... existing logic
}
```

---

### CR-03: `/api/seal/proposals` GET endpoint requires no authentication — SEAL proposal data is public

**File:** `apps/memroos/src/app/api/seal/proposals/route.ts:15-22`
**Issue:** The `GET` handler for listing all SEAL proposals has no authentication check whatsoever. The `POST` (create proposals) correctly calls `authorizeRegistryWrite`, but the GET is a plain unauthenticated export of every SEAL proposal including `rationale`, `diff`, and `baselineW` scores. Any unauthenticated caller can enumerate all proposals.

```typescript
export function GET(req: NextRequest) {
  const url = req.nextUrl ?? new URL(req.url);
  const service = new SealService();
  return Response.json({ proposals: service.listProposals(...) }); // No auth
}
```

**Fix:** Add authentication and at least `reviewer` role enforcement:
```typescript
export async function GET(req: NextRequest) {
  const session = await authenticateUser(req);
  const roleError = requireRole(session?.role, 'reviewer');
  if (roleError) return roleError;
  if (!session) return Response.json({ error: 'authentication required' }, { status: 401 });
  // ... existing logic
}
```

---

### CR-04: `/api/seal/audit` GET endpoint requires no authentication — SEAL audit log is public

**File:** `apps/memroos/src/app/api/seal/audit/route.ts:12-21`
**Issue:** The SEAL audit log endpoint has no authentication. Any unauthenticated caller can read proposal IDs, events (`proposed`, `approved`, `rejected`, `apply_started`, `apply_succeeded`), baseline W scores, and delta values.

```typescript
export function GET(req: NextRequest) {
  const service = new SealService();
  return Response.json({ entries: service.queryAuditLog(...) }); // No auth
}
```

**Fix:** Same pattern as CR-03 — add `authenticateUser` + `requireRole(..., 'reviewer')`.

---

### CR-05: `/api/seal/proposals/[id]` GET requires no authentication — individual proposal data is public

**File:** `apps/memroos/src/app/api/seal/proposals/[id]/route.ts:15-20`
**Issue:** The individual proposal GET handler has no authentication. The `POST` handler on the same route checks for either `x-user-id` header (set by middleware for JWT-authenticated users) or `authorizeRegistryWrite`, but the GET is open:

```typescript
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const service = new SealService();
  const proposal = service.getProposal(id);
  // No auth — returns full proposal including diff, rationale, baselineLayers
}
```

**Fix:** Same — add `authenticateUser` + `requireRole(..., 'reviewer')`.

---

### CR-06: `/api/context/health` exposes internal system topology to unauthenticated callers

**File:** `apps/memroos/src/app/api/context/health/route.ts:5-15`
**Issue:** The context health endpoint has no authentication. It returns the full `ContextHealthResponse` including: source IDs (`gmail`, `spark`, `qmd`, `mem0`, `local-folder`), resolved file system paths (via `lastError: "missing source path: /absolute/path/..."` and `repairHint`), tool availability (presence of `qmd`, `spark`, etc.), and freshness data. This is an information-disclosure vector — an attacker learns the internal directory layout, which tools are installed, and which data sources are configured.

**Fix:**
```typescript
export async function GET(req: Request) {
  const session = await authenticateUser(req);
  if (!session) return Response.json({ error: 'authentication required' }, { status: 401 });
  // ... existing logic
}
```

---

### CR-07: Registration race condition — first-user admin bootstrap is exploitable without rate limiting

**File:** `apps/memroos/src/app/api/auth/register/route.ts:33-40`
**Issue:** The "first user becomes admin" path uses a non-atomic check-then-insert pattern:

```typescript
const userCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }).cnt;
if (userCount === 0) {
  role = 'admin';
} else { /* invite required */ }
// ... (invite validation happens here)
// Check email not already taken
const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
// INSERT INTO users ...
```

Two simultaneous registration requests can both observe `userCount === 0`, both skip invite validation, and both create admin accounts. SQLite serializes writes, so only one INSERT will succeed if there is a UNIQUE constraint on `email` — but if the two requests use different emails, both will succeed and the system will have two admin accounts created without invite tokens.

The window is small but real, and the consequence (unintended admin account creation) is severe.

**Fix:** Wrap the count check, invite validation, email uniqueness check, and user insert in a single `db.transaction()`:
```typescript
const result = db.transaction(() => {
  const userCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }).cnt;
  // ... all validation and insert inside transaction
})();
```

---

### CR-08: `operator-auth.ts` trusts `x-forwarded-host` for loopback bypass — SSRF / header injection path

**File:** `apps/memroos/src/lib/operator-auth.ts:6-28`
**Issue:** `getRequestHostname` prefers `x-forwarded-host` over the URL's own hostname when determining whether a request originates from loopback:

```typescript
function forwardedHost(request: Request): string | null {
  const forwardedHostHeader = request.headers.get("x-forwarded-host");
  const host = forwardedHostHeader?.split(",")[0]?.trim();
  return host || null;
}

function getRequestHostname(request: Request): string | null {
  const host = forwardedHost(request);
  if (host) return hostnameFromHostHeader(host);
  // ...
}
```

`authorizeRegistryWrite` returns `true` when `isLoopbackHost(hostname)` is true. If a reverse proxy or load balancer does not strip or override `x-forwarded-host`, an external attacker can send `x-forwarded-host: localhost` and bypass the `MEMROOS_OPERATOR_API_KEY` requirement entirely, gaining write access to the agent registry, SEAL proposals, and finance reconciliation endpoints.

Note: `AUTH_TRUST_PROXY_HEADERS` controls a similar guard in `rate-limit.ts` but no analogous env var is checked here.

**Fix:** Either (a) never trust `x-forwarded-host` for security decisions (use only `request.url`), or (b) gate the forwarded-host trust on an `OPERATOR_TRUST_PROXY_HEADERS` environment variable defaulting to `false`:
```typescript
function getRequestHostname(request: Request): string | null {
  if (process.env.OPERATOR_TRUST_PROXY_HEADERS === 'true') {
    const host = forwardedHost(request);
    if (host) return hostnameFromHostHeader(host);
  }
  try {
    return new URL(request.url).hostname;
  } catch {
    return null;
  }
}
```

---

## Warnings

### WR-01: Auth check ordering — `requireRole` called before null-guarding session, returns 403 instead of 401

**File:** `apps/memroos/src/app/api/auth/invite/route.ts:17-21` (also `audit/route.ts:19-22`, `escalations/route.ts:19-22`, `escalations/[id]/resolve/route.ts:21-24`)
**Issue:** The pattern throughout the codebase is:
```typescript
const session = await authenticateUser(req);
const roleError = requireRole(session?.role, 'admin');
if (roleError) return roleError;
if (!session) return Response.json({ error: 'authentication required' }, { status: 401 });
```
When `session` is `null`, `requireRole(null, 'admin')` returns a 403 response (insufficient permissions), which is returned before the null check. An unauthenticated caller receives a 403 instead of a 401 — this misrepresents the error and could confuse clients. It also leaks that the route exists and requires elevated privileges.

**Fix:** Swap the order — check for unauthenticated session first:
```typescript
const session = await authenticateUser(req);
if (!session) return Response.json({ error: 'authentication required' }, { status: 401 });
const roleError = requireRole(session.role, 'admin');
if (roleError) return roleError;
```

---

### WR-02: `resolve/route.ts` casts session role to "admin"|"operator" without validation — reviewer can escalate to operator

**File:** `apps/memroos/src/app/api/escalations/[id]/resolve/route.ts:54`
**Issue:** The `resolveEscalation` call uses a cast:
```typescript
resolveEscalation(
  id,
  { actorId: session.userId, actorRole: session.role as "admin" | "operator", note },
  db
);
```
The `requireRole(session?.role, 'operator')` check is on line 22, but because of the ordering bug (WR-01), an unauthenticated request already returns 403. However, the cast itself — absent TypeScript strictness enforcement at the call site — silently accepts a reviewer role and passes it to `resolveEscalation`, where it is written directly to `actor_role` in the audit log. If the ordering bug (WR-01) is ever fixed incorrectly or if the role check is removed, audit entries would be written with false actor_role values.

**Fix:** Add an explicit runtime type guard instead of casting:
```typescript
const actorRole = session.role === 'admin' || session.role === 'operator' ? session.role : null;
if (!actorRole) return Response.json({ error: 'insufficient permissions' }, { status: 403 });
resolveEscalation(id, { actorId: session.userId, actorRole, note }, db);
```

---

### WR-03: `SdkBackedEvalService` uses hardcoded fallback API key in non-production environments

**File:** `apps/memroos/src/lib/seal/sdk-eval-service.ts:91-95`
**Issue:**
```typescript
const apiKey = options.apiKey ?? process.env.MEMROOS_INTERNAL_API_KEY;
if (!apiKey && process.env.NODE_ENV === "production") {
  throw new Error("MEMROOS_INTERNAL_API_KEY is required for production SEAL SDK eval service");
}
this.apiKey = apiKey ?? "memroos-internal-default-key";
```
The string `"memroos-internal-default-key"` is a hardcoded default used when `NODE_ENV !== 'production'` and the env var is absent. If someone misconfigures `NODE_ENV` as `"development"` but points `MEMROOS_PUBLIC_API_URL` at a production server, this default key will be sent in `Authorization: Bearer` headers against real production API endpoints. The key is also present in source control and could be used by anyone who reads the code.

**Fix:** Remove the hardcoded fallback. Fail loudly in all environments when the key is absent and the URL is non-localhost:
```typescript
this.apiKey = apiKey ?? (() => {
  throw new Error("MEMROOS_INTERNAL_API_KEY is required");
})();
```

---

### WR-04: Rate limiter is in-memory and per-process — ineffective in multi-process or serverless deployments

**File:** `apps/memroos/src/lib/auth/rate-limit.ts:8`
**Issue:** `const buckets = new Map<string, Bucket>()` is module-level, meaning each Node.js process has its own independent rate limit counter. In serverless deployments (Vercel, Cloudflare Workers) or any multi-process setup, an attacker can issue requests that hit different processes and never be limited. The `login` and `refresh` endpoints depend on this for brute-force protection.

**Fix:** Replace the in-memory map with a shared store (Redis, KV, or a rate-limit table in SQLite if single-process is guaranteed). At minimum, document the limitation prominently and enforce that this is only deployed single-process.

---

### WR-05: `context-sources.ts` leaks absolute filesystem paths in unauthenticated API response

**File:** `apps/memroos/src/lib/context-sources.ts:167-169`
**Issue:** When a source path is missing, the `lastError` field is set to:
```typescript
lastError: `missing source path: ${resolvedPath}`,
```
where `resolvedPath` is the fully expanded absolute path (e.g., `/home/USERNAME/data/gmail-export`). This path is returned in the `/api/context/health` response (CR-06 above). Even if CR-06 is fixed and auth is added, this information should be sanitized or omitted from responses visible to `reviewer` role users.

**Fix:** Return only the configured `sourcePath` (with un-expanded `${VAR}` tokens) in error messages, not the resolved absolute path.

---

### WR-06: `agent_instruction_patch` applyShadow inserts empty string when `diff.after` is null — corrupts agent instructions

**File:** `apps/memroos/src/lib/seal/proposal-registry.ts:222-223`
**Issue:** When a SEAL proposal is applied for `agent_instruction_patch`, the `after` field in the diff is expected to carry the new instruction text. However:
```typescript
const after = diff["after"] as string | null | undefined;
// ...
info = db.prepare("INSERT INTO agent_instructions ... VALUES (?, ?, ?, 1)").run(agentId, after ?? "", nextVersion);
```
If `after` is `null` (which is the default in `buildDraft`), the insert proceeds with an empty string `""` as the instruction text, deactivating the previous instruction and replacing it with nothing. The proposal lifecycle does not validate that `after` is non-null before `applyShadow` is called.

**Fix:** Add a null check in `applyShadow`:
```typescript
if (!after) return { applied: false, reason: "Missing 'after' instruction text in diff" };
```

---

### WR-07: `parseTransactionCsv` has no size limit — a large CSV body causes unbounded memory allocation

**File:** `apps/memroos/src/lib/finance-reconciliation/index.ts:154-166`
**Issue:** The finance reconciliation CSV parser allocates an in-memory array of all rows (`parseCsvRows` → `rows.map(...)`) with no limit. The route handler caps the `count` for demo mode (`Math.min(500, ...)`), but for `mode: "csv"`, the raw `body.csv` string is passed directly with no size or row count validation. A caller with operator API key access can POST a multi-megabyte CSV and cause significant memory pressure.

**Fix:** Add a size check before parsing:
```typescript
if (body.csv.length > 5_000_000) { // 5 MB limit
  return Response.json({ error: 'CSV payload too large' }, { status: 413 });
}
```

---

### WR-08: `stableStringify` in `middleware.ts` crashes on non-object input

**File:** `apps/memroos/src/lib/agent-runtime/middleware.ts:51-53`
**Issue:**
```typescript
function stableStringify(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
}
```
`Object.keys(value as ...)` throws a `TypeError` if `value` is `null`, a primitive, or an array, because `Object.keys` requires an object. `hashInput` calls this with `params.input` which is typed as `Record<string, unknown>` but can receive arrays or null if the caller is permissive. The crash would silently surface as an unhandled error in `runToolWithMiddleware`.

**Fix:**
```typescript
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
}
```

---

### WR-09: `audit/query.ts` cursor-based pagination uses `created_at` timestamp — non-unique, can silently skip records

**File:** `apps/memroos/src/lib/audit/query.ts:69-72, 81`
**Issue:** The cursor implementation uses `created_at` as the cursor value:
```typescript
if (filter.cursor) {
  conditions.push("created_at < ?");
  params.push(filter.cursor);
}
// ...
const nextCursor = hasMore ? entries[entries.length - 1]?.created_at : undefined;
```
If multiple audit entries share the same `created_at` timestamp (possible when entries are inserted in a tight loop or in a transaction), entries at the cursor boundary are silently skipped. For an immutable audit log used for compliance, skipping entries during pagination is a data-integrity defect.

**Fix:** Use a composite cursor of `(created_at, id)` to guarantee uniqueness:
```typescript
conditions.push("(created_at < ? OR (created_at = ? AND id < ?))");
params.push(filter.cursor.timestamp, filter.cursor.timestamp, filter.cursor.id);
```

---

## Info

### IN-01: `SdkBackedEvalService.getRunById` always returns null — violates interface contract silently

**File:** `apps/memroos/src/lib/seal/sdk-eval-service.ts:175-179`
**Issue:** The `getRunById` method is documented as "not needed by SealService.applyProposal() in the SDK path" but returns `null` unconditionally. If callers evolve to call this method in the SDK path, the silent `null` will cause failures that are hard to diagnose. A throw would be more honest.

**Fix:** `throw new Error("SdkBackedEvalService.getRunById is not implemented");`

---

### IN-02: `audit/export/route.ts` — `unused import` of `getDb`

**File:** `apps/memroos/src/app/api/audit/export/route.ts:3`
**Issue:** `import { getDb } from "@/lib/db"` is present but `getDb` is called indirectly via `streamAuditEntries(filter, db)` which receives `db = getDb()` — the import is used. On second look this is valid. No action needed — disregard.

---

### IN-03: Hardcoded `"default-tenant"` scattered across auth and session code

**Files:** `apps/memroos/src/lib/auth/session.ts:47`, `apps/memroos/src/lib/audit/write.ts:24`
**Issue:** The string `"default-tenant"` is used as a fallback tenant ID in multiple places. For a system with compliance data-residency controls, a multi-tenant hardcoded fallback is a future correctness risk. When proper multi-tenancy is added, any code path that silently falls back to `"default-tenant"` will produce misattributed audit entries.

**Fix:** Replace with a named constant and add a `TODO` indicating where this must be replaced with real tenant resolution when multi-tenancy ships.

---

### IN-04: `proxy.ts` CSP allows `unsafe-eval` — weakens XSS protection

**File:** `apps/memroos/src/proxy.ts:51`
**Issue:** The Content-Security-Policy includes `'unsafe-eval'` in `script-src`:
```
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```
Both `unsafe-inline` and `unsafe-eval` together essentially disable the XSS protection that CSP provides. Given that CR-01 (access token readable by JS) is open, this compounds the risk.

**Fix:** Work toward removing `unsafe-eval` (typically requires Next.js config adjustments) and replace `unsafe-inline` with a nonce-based approach. In the near term, at minimum document why both are required.

---

_Reviewed: 2026-05-17T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
