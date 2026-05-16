---
phase: 64
name: Immutable Audit + HIL Escalation
status: ready-for-planning
gathered: 2026-05-16
---

# Phase 64: Immutable Audit + HIL Escalation — Context

**Gathered:** 2026-05-16
**Status:** Ready for planning
**Mode:** Autonomous `/gsd-autonomous --only 64`

<domain>
## Phase Boundary

Phase 64 ships a single unified, immutable `audit_entries` table that captures every significant decision event across the entire platform — agent match/flag/escalate, SEAL proposal lifecycle, and eval run completions — with a verified actor identity from Phase 63, a structured event type, and a freeform metadata JSON payload. Alongside it, an `hil_escalations` table tracks open human-in-the-loop work items with configurable SLA deadlines and a team-visible resolution queue in the UI.

**In scope for Phase 64:**
- `audit_entries` unified table — append-only, SQLite trigger-enforced immutability, full index suite for 200ms query SLA at 1M rows
- `hil_escalations` table — distinct from audit, owns open-item lifecycle with `resolved_at`, per-type SLA configuration, and overdue flagging
- Migration of `seal_audit_log` entries into `audit_entries`; `seal_audit_log` becomes a read-only view alias
- `audit_entries` query API — filterable by agent, time range, event type, actor; JSON + NDJSON streaming export; CSV export
- HIL escalation queue — `GET /api/escalations` (open items with SLA countdown), `POST /api/escalations/:id/resolve` (operator/admin only)
- Kitchen UI: `/audit` page (log viewer, filter panel, export button) and `/escalations` page (team queue with SLA countdown, overdue-red flagging)
- RBAC enforcement from Phase 63: admin + operator can resolve escalations; reviewer reads both pages; non-authenticated blocked by middleware
- Updated `writeAuditEntry()` adapter writes to `audit_entries`; existing `seal_audit_log` write path becomes a compatibility shim
- 1M-row perf verification: seed script + automated assertion (p95 < 200ms)

**Out of scope for Phase 64:**
- Tamper-evident hash chaining (`prev_hash` per row) — deferred to Phase 66 compliance hardening
- Log retention policies and archival — Phase 66
- Finance-vertical audit terminology overlays (`reconciliation`, `exception`) — Phase 65
- Email/webhook delivery of escalation notifications — Phase 66
- Audit log access from the public eval API/SDK — Phase 62 surface is not extended here
</domain>

<decisions>
## Key Decisions

### Decision 1 — Unified `audit_entries` table supersedes the Phase 58 no-merge ruling

Phase 58 CONTEXT decision #4 stated: "No merger with the existing audit_log table — the schemas are incompatible and the semantic scopes are different."

**Phase 64 overrules this.** The v3 compliance framing (see `.planning/notes/v3-strategic-framing.md`) requires a single queryable surface for finance clients and auditors — they must be able to query ALL decision events in one place. Two separate tables (plus the legacy `audit_log`) make this impossible without application-level UNION queries that drift out of sync.

The unification is viable because the schemas are a superset, not a conflict:
- `seal_audit_log`'s `baseline_w`, `post_apply_w`, `delta_l1/l2/l3/composite` columns collapse cleanly into `metadata_json`
- `audit_log`'s (SEC-02) `actor`, `action`, `target`, `severity` columns map to `actor_id`, `event_type`, `entity_id`, and `metadata_json.severity` respectively
- No information is lost; the unified schema is a strict superset

The migration strategy in Decision 6 handles the transition without data loss. `seal_audit_log` becomes a backward-compatible read-only view. The existing `writeAuditEntry()` function is updated to write to `audit_entries` directly.

### Decision 2 — Immutability via triggers + code convention (both layers)

Immutability is enforced at two layers:

**Layer 1 — SQLite triggers (hard enforcement):**
```sql
CREATE TRIGGER IF NOT EXISTS audit_entries_no_update
  BEFORE UPDATE ON audit_entries
BEGIN
  SELECT RAISE(ABORT, 'audit_entries is append-only: UPDATE is not permitted');
END;

CREATE TRIGGER IF NOT EXISTS audit_entries_no_delete
  BEFORE DELETE ON audit_entries
BEGIN
  SELECT RAISE(ABORT, 'audit_entries is append-only: DELETE is not permitted');
END;
```
These triggers fire at the SQLite engine level, regardless of application layer. They cannot be bypassed by ORM bugs or copy-paste mistakes.

**Layer 2 — Code convention (no UPDATE/DELETE paths):**
The `audit.ts` service module exposes only `writeAuditEntry(...)` (INSERT) and `queryAuditLog(...)` (SELECT). No UPDATE or DELETE statements exist anywhere in the service. TypeScript's module boundary enforces this — callers import only what is exported.

**Test environment note:** The triggers are created in all environments including test. Tests that need to verify immutability attempt an UPDATE and assert it throws. No dev-only override env var is provided — if the trigger fires in a test, that is the correct behavior (it proves immutability works).

### Decision 3 — Unified `audit_entries` schema (no `updated_at`, `tenant_id` from day one)

```sql
CREATE TABLE IF NOT EXISTS audit_entries (
  id            TEXT PRIMARY KEY,          -- UUID v4
  tenant_id     TEXT NOT NULL DEFAULT 'default-tenant'
                REFERENCES tenants(id),
  actor_id      TEXT NOT NULL,             -- user.id from Phase 63 (or 'system' for automated events)
  actor_role    TEXT NOT NULL,             -- 'admin'|'operator'|'reviewer'|'system'
  event_type    TEXT NOT NULL,             -- see Event Type Taxonomy below
  entity_type   TEXT NOT NULL,             -- 'agent'|'seal_proposal'|'eval_run'|'hil_escalation'
  entity_id     TEXT NOT NULL,             -- FK to the owning entity; format: "<type>:<id>"
  reason        TEXT,                      -- human-readable rationale (optional for system events)
  metadata_json TEXT NOT NULL DEFAULT '{}',-- all event-specific fields (W deltas, severity, etc.)
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
  -- NO updated_at: append-only; updates would violate immutability
);
```

No `updated_at` column — the table is append-only. Any correction or annotation creates a new row with `event_type = 'annotation'` referencing the original entry in `metadata_json`.

`tenant_id` is present from day one. Every write path receives a `tenantId` parameter; the default is `'default-tenant'` for single-tenant deployments.

`actor_id` references `users.id` (Phase 63's `TEXT PRIMARY KEY` nanoid) for human actors, and the literal string `'system'` for automated events (SEAL apply, eval rerun, scheduled jobs). `actor_role` mirrors the user's role at write time (denormalized for query performance — role changes do not retroactively alter audit history).

### Decision 4 — Event Type Taxonomy (closed enum at v1)

All valid `event_type` values are enumerated as a TypeScript const in `apps/kitchen/src/lib/audit/event-types.ts`. Adding a new type requires a code change to this file, same pattern as SEAL's closed proposal-type registry. This ensures query filters are validated at compile time.

Taxonomy (v1):
```
// Agent decisions
agent.matched          — agent matched a task to a capability
agent.flagged          — agent flagged an item for human review
agent.escalated        — agent escalated to HIL queue

// SEAL proposal lifecycle
seal.proposed          — reflection generated a proposal
seal.approved          — operator approved a proposal
seal.rejected          — operator rejected a proposal
seal.apply_started     — isolated apply began
seal.apply_succeeded   — apply kept (W_post >= W_baseline)
seal.apply_failed      — apply rolled back (W_post < W_baseline)
seal.rolled_back       — manual rollback after apply

// Eval runs
eval.completed         — eval run completed with W score
eval.drift_halted      — drift guard halted (agreement < 0.85)

// HIL escalations
hil.created            — escalation opened
hil.resolved           — escalation resolved (operator/admin)
hil.sla_breached       — SLA deadline passed without resolution (system event)

// Admin / system
audit.annotation       — annotation added to a prior entry (metadata_json.ref_entry_id)
```

### Decision 5 — `hil_escalations` is a separate table, not a view over `audit_entries`

Escalations are open work items with mutable state (`resolved_at`, `assigned_to`, `resolution_note`). Audit entries are immutable facts. They are different abstractions. Each lifecycle event of an escalation (created, resolved, SLA breached) writes a row to `audit_entries`; the escalation table itself tracks the current open/resolved state.

```sql
CREATE TABLE IF NOT EXISTS hil_escalations (
  id              TEXT PRIMARY KEY,
  tenant_id       TEXT NOT NULL DEFAULT 'default-tenant'
                  REFERENCES tenants(id),
  entity_type     TEXT NOT NULL,               -- 'agent_decision'|'seal_proposal'|'eval_run'
  entity_id       TEXT NOT NULL,
  escalation_type TEXT NOT NULL,               -- enum: 'agent_escalate'|'seal_approval'|'eval_below_threshold'
  sla_seconds     INTEGER NOT NULL,            -- copied from config at creation time
  sla_deadline    TEXT NOT NULL,               -- created_at + sla_seconds, computed at insert
  status          TEXT NOT NULL DEFAULT 'open'
                  CHECK(status IN ('open','resolved','sla_breached')),
  assigned_to     TEXT REFERENCES users(id),   -- optional; null = unassigned
  opened_by       TEXT NOT NULL,               -- actor_id: 'system' or user.id
  resolved_by     TEXT REFERENCES users(id),
  resolution_note TEXT,
  resolved_at     TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS hil_status_deadline
  ON hil_escalations(status, sla_deadline ASC);
CREATE INDEX IF NOT EXISTS hil_tenant_status
  ON hil_escalations(tenant_id, status, sla_deadline ASC);
CREATE INDEX IF NOT EXISTS hil_entity
  ON hil_escalations(entity_type, entity_id);
```

`sla_deadline` is stored as a computed ISO timestamp (not derived via SQL expression) so the index works efficiently. The SLA resolution cron (or next-request lazy check) sets `status = 'sla_breached'` and writes an `audit_entries` row with `event_type = 'hil.sla_breached'` when `sla_deadline < now() AND status = 'open'`.

### Decision 6 — Migration strategy: dual-write then cutover

Migration proceeds in four ordered steps:

1. **Create** `audit_entries` and `hil_escalations` tables with triggers and indexes (additive DDL in `initSchema`).
2. **Backfill** — one-time migration script (`scripts/migrate-audit-entries.ts`) reads all rows from `seal_audit_log` and `audit_log` and inserts them into `audit_entries`. Guarded by a `meta` flag (`audit_entries_backfill_done`) so it only runs once.
3. **Dual-write** — `writeAuditEntry()` writes to both `seal_audit_log` (backward compat) and `audit_entries` during the transition period. New write paths (agent decisions, eval completions) write only to `audit_entries`.
4. **Cutover** — once Phase 65 is complete and no reads target `seal_audit_log` directly, the dual-write shim is removed; `seal_audit_log` becomes a read-only SQL view aliasing `audit_entries` rows where `entity_type = 'seal_proposal'`.

### Decision 7 — Index suite for 200ms / 1M rows query SLA

AUDIT-02 requires queries by agent, time range, decision type, and actor. The following indexes cover all four discriminators:

```sql
CREATE INDEX IF NOT EXISTS audit_entries_created    ON audit_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_entries_entity      ON audit_entries(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_entries_event_type  ON audit_entries(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_entries_actor       ON audit_entries(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_entries_tenant      ON audit_entries(tenant_id, created_at DESC);
```

Compound index on `(tenant_id, event_type, created_at DESC)` is added for the common multi-tenant filtered query pattern.

The 200ms requirement is verified by the perf-test task (Task 11 in PLAN.md): a seed script inserts 1M rows into a test DB, and a query harness asserts all four filter patterns complete in under 200ms at p95.

### Decision 8 — Export: streaming NDJSON + CSV

Two export endpoints:
- `GET /api/audit/export?format=ndjson` — streams one JSON object per line (NDJSON); suitable for large exports and resumability
- `GET /api/audit/export?format=csv` — Node.js `Response` body stream; CSV with header row

The same filter parameters as the query endpoint apply to both export formats. Large exports bypass the 200-item UI pagination limit. No in-memory buffering of the full result set — both endpoints use SQLite's `cursor` / `prepare().iterate()` to stream rows.

### Decision 9 — SLA configuration in `memroos.eval.yaml`

Per-type SLA defaults:
```yaml
hil:
  sla_defaults:
    agent_escalate: 4h         # agent escalated a decision
    seal_approval: 24h         # SEAL proposal awaiting operator approval
    eval_below_threshold: 8h   # eval W below threshold, requires review
```

Operators override these in their local `memroos.eval.yaml` without code changes. The `sla_seconds` value is resolved at escalation creation time from the config and stored in the row — config changes do not retroactively alter open escalations.

### Decision 10 — actor_id dependency on Phase 63

Phase 64 depends on Phase 63's `users` table (`users.id TEXT PRIMARY KEY` — nanoid). For automated system events, `actor_id = 'system'` and `actor_role = 'system'`. For human actions, `actor_id` is the authenticated user's `users.id`, resolved via `authenticateUser(req)` from `apps/kitchen/src/lib/user-auth.ts` (Phase 63).

If Phase 64 is implemented before Phase 63 ships, every route that writes audit entries must accept a fallback: if no authenticated user is present (pre-auth phase), `actor_id = 'anonymous'` and `actor_role = 'system'`. This fallback is removed once Phase 63 middleware is enforced.
</decisions>

<code_context>
## Existing Code Insights

**Tables already in `apps/kitchen/src/lib/db-schema.ts` that Phase 64 must co-exist with:**
- `audit_log` (SEC-02) — `actor TEXT`, `action TEXT`, `target TEXT`, `severity TEXT`, `timestamp TEXT`. All columns map to `audit_entries`; this table is migrated and becomes a view.
- `seal_audit_log` (Phase 58) — W-delta columns collapse into `metadata_json`. `writeAuditEntry()` in `apps/kitchen/src/lib/seal/audit.ts` is the existing write path; Phase 64 updates it to write to `audit_entries`.
- `seal_proposals`, `seal_proposal_decisions` — `entity_type = 'seal_proposal'`, `entity_id = proposal.id` in audit entries.
- `eval_runs` — `entity_type = 'eval_run'`, `entity_id = run.id` in audit entries.
- `tenants`, `tenant_api_keys` — `tenant_id` FK target for audit_entries.

**Phase 63 tables that Phase 64 depends on (not yet shipped):**
- `users(id TEXT PRIMARY KEY)` — `actor_id` FK target for human actions.
- `user_roles` — used to denormalize `actor_role` at write time.
- `authenticateUser(req)` in `apps/kitchen/src/lib/user-auth.ts` — resolves `actor_id` from JWT.

**Existing patterns Phase 64 follows:**
- All DDL is additive — `CREATE TABLE IF NOT EXISTS`, no destructive changes.
- Additive column migrations via `ALTER TABLE ... ADD COLUMN` wrapped in try/catch.
- One-shot migrations guarded by a `meta` flag (pattern established for `hive_delegations_v2_migrated`).
- API routes use `Response.json(...)` and `export const dynamic = "force-dynamic"`.
- TanStack Query hooks in `apps/kitchen/src/lib/api-client.ts` for all UI data fetching.
- Sidebar nav in `apps/kitchen/src/components/layout/sidebar.tsx` — Phase 64 adds `/audit` and `/escalations` entries (after the SEAL entry Phase 58 added).

**New library location:** `apps/kitchen/src/lib/audit/` — separate from `apps/kitchen/src/lib/seal/audit.ts`. The SEAL-specific write helper becomes a thin adapter calling the unified library.

**RBAC enforcement:** Phase 63's middleware already enforces JWT on all non-public API routes. Phase 64 adds route-level role checks:
- `GET /api/audit` — reviewer, operator, admin
- `GET /api/audit/export` — operator, admin (reviewer does not get bulk export access to protect against data exfiltration)
- `GET /api/escalations` — reviewer, operator, admin
- `POST /api/escalations/:id/resolve` — operator, admin only
</code_context>

<specifics>
## Specific Implementation Shape

### New library: `apps/kitchen/src/lib/audit/`
- `event-types.ts` — `AUDIT_EVENT_TYPES` const object, `AuditEventType` union type, taxonomy per Decision 4
- `schema.ts` — `AuditEntry` and `HilEscalation` TypeScript types
- `write.ts` — `writeAuditEntry(entry, db?)` (INSERT only); `openEscalation(params, db?)` (INSERT to hil_escalations + write `hil.created` audit entry); `resolveEscalation(id, resolution, db?)` (UPDATE hil_escalations + write `hil.resolved` audit entry — NOTE: escalation table IS mutable; only audit_entries is immutable)
- `query.ts` — `queryAuditEntries(filter, db?)` → paginated results; `streamAuditEntries(filter, db?)` → iterator for export; `queryEscalations(filter, db?)` → open/resolved/all
- `sla.ts` — `checkSlaBreaches(db?)` — marks overdue escalations as `sla_breached` and writes audit entries; called on each GET /escalations response to lazily enforce SLA

### API routes
- `apps/kitchen/src/app/api/audit/route.ts` — `GET` (query with filters: agent_id, event_type, actor_id, from, to, limit, cursor); `GET /api/audit/export` as a separate route handler for streaming
- `apps/kitchen/src/app/api/audit/export/route.ts` — streaming NDJSON and CSV export
- `apps/kitchen/src/app/api/escalations/route.ts` — `GET` (list open/all escalations with SLA countdown); triggers lazy SLA breach check
- `apps/kitchen/src/app/api/escalations/[id]/resolve/route.ts` — `POST` (operator/admin only; writes resolution + audit entry)

### UI pages
- `apps/kitchen/src/app/audit/page.tsx` — log viewer with filter sidebar (agent dropdown, event type multi-select, date range, actor); paginated table; Export button (NDJSON/CSV)
- `apps/kitchen/src/app/escalations/page.tsx` — team queue; cards showing entity type, entity ID, escalation type, SLA countdown (red when overdue); Resolve button (operator/admin only); read-only for reviewer role

### Sidebar additions (in `sidebar.tsx`)
```typescript
{ href: "/audit",       label: "Audit Log",    description: "Immutable decision history", icon: ClipboardList },
{ href: "/escalations", label: "Escalations",  description: "HIL queue with SLA",        icon: AlertTriangle },
```

### SEAL audit adapter update
`apps/kitchen/src/lib/seal/audit.ts` — `writeAuditEntry()` updated to call the new unified `writeAuditEntry()` from `apps/kitchen/src/lib/audit/write.ts` with appropriate field mapping (`entity_type = 'seal_proposal'`, W-delta fields in `metadata_json`). The legacy INSERT to `seal_audit_log` is kept as a dual-write shim until cutover.

### Schema additions in `apps/kitchen/src/lib/db-schema.ts`
All additive:
1. `audit_entries` table + 6 indexes + 2 immutability triggers
2. `hil_escalations` table + 3 indexes
3. One-shot backfill migration (guarded by `meta` flag)
4. `seal_audit_log` backward-compat view (after backfill migration runs)

### Config surface (`memroos.eval.yaml`)
```yaml
hil:
  sla_defaults:
    agent_escalate: 4h
    seal_approval: 24h
    eval_below_threshold: 8h
```

### Tests
- `writeAuditEntry` inserts a row; attempt to UPDATE the row throws the trigger error
- `writeAuditEntry` inserts a row; attempt to DELETE the row throws the trigger error
- `queryAuditEntries` with each filter type returns correct results on a seeded test DB
- `openEscalation` creates an escalation + writes a `hil.created` audit entry atomically
- `resolveEscalation` sets `resolved_at`, writes a `hil.resolved` audit entry, rejects if caller is reviewer role
- SLA breach check: escalation past deadline transitions to `sla_breached` + writes `hil.sla_breached` audit entry
- Export endpoints return valid NDJSON and CSV for a filtered query
- API GET /audit returns 403 for unauthenticated; 200 for reviewer; correct filtered results
- API POST /escalations/:id/resolve returns 403 for reviewer role; 200 for operator
- Perf test: 1M rows seeded, all 4 filter patterns complete in < 200ms p95
</specifics>

<deferred>
## Deferred to Later Phases

- **Tamper-evident hash chaining** (`prev_hash TEXT` column linking each row to its predecessor SHA-256 hash) — Phase 66 compliance hardening. The column slot is reserved in schema docs but not created in Phase 64. Adding it requires computing the hash chain on insert, which is a performance concern at high write rates.
- **Log retention and archival policies** — Phase 66. Admin panel will configure maximum retention days; old entries archived to cold storage or deleted per operator policy.
- **Audit log access from the public eval API** — Phase 62's external surface is not extended in Phase 64. Tenant-scoped audit access for external customers is a post-v3 consideration.
- **Email/webhook escalation notifications** — Phase 66 (adds SMTP config). Phase 64 only surfaces escalations in the UI queue.
- **Nav item visibility gating by role** (hiding Audit from reviewer in nav) — Phase 66. Currently all nav items are visible; access control is enforced at API and page level.
- **Finance-vertical audit terminology overlays** (`reconciliation`, `exception`, `transaction` labels) — Phase 65. The core audit infrastructure ships terminology-agnostic.
- **Bulk escalation resolution** (resolve-all) — post-v3 UX iteration.
- **Audit log search / FTS** — post-v3. Current query model is filter-only (exact match on indexed columns). FTS over `reason` and `metadata_json` is deferred.
</deferred>
