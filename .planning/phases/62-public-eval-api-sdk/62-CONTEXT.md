---
phase: 62
name: Public Eval API + SDK
status: ready-for-planning
gathered: 2026-05-15
---

# Phase 62: Public Eval API + SDK — Context

<domain>
## Phase Boundary

Phase 62 ships the externally-facing eval product surface: a versioned, tenant-isolated HTTP eval API at `/api/public/v1/`, two SDKs (`packages/sdk-ts/` and `packages/sdk-py/`), a customer quickstart guide, and a refactor of Phase 59/60's internal eval calls to go through the public API surface (proving the framework-agnostic contract on real internal traffic).

### In scope

- Tenant model: `tenants` and `tenant_api_keys` tables; additive `tenant_id` column on all existing v2.5 eval tables; per-API-key tenant resolution middleware
- Public HTTP surface at `/api/public/v1/eval/` (POST: submit trace, GET run result); `/api/public/v1/proposals/` (GET: list proposals for a tenant); tenant scoping enforced on all routes
- OpenInference trace format support (pinned to `openinference-semantic-conventions` v0.1.x): mapper from OpenInference span attributes to `AgentEvalTrace`; MemroOS JSON format is `AgentEvalTrace` from `apps/memroos/src/lib/evals/types.ts` — no new schema invented
- TypeScript SDK: `packages/sdk-ts/` — publish as `@memroos/sdk`; wraps public API with typed request/response models; includes `submitTrace()`, `getRunResult()`, `listProposals()`, and streaming support
- Python SDK: `packages/sdk-py/` — publish as `memroos`; same surface in idiomatic Python (dataclasses, async/await, type hints); `pip install memroos` smoke-test
- Rate limiting: token-bucket per `tenant_id`, configurable cap, `X-RateLimit-*` response headers
- Customer quickstart: `docs/eval-quickstart.md` — "first eval in 5 minutes" walkthrough from `pip install memroos` / `npm i @memroos/sdk` through first scored trace
- Phase 59 + Phase 60 refactor: update `apps/memroos/src/lib/seal/reflection.ts` and `apps/memroos/src/lib/seal/apply.ts` (and any Phase 59 memory-eval callers) to route their `EvalService` calls through the public HTTP surface using the TypeScript SDK, with a `localhost`-configured SDK client. This proves API-06.
- Dogfood verification test: an integration test that runs the Phase 59 memory autogen loop and Phase 60 agent autogen loop end-to-end using only public API calls, not internal imports of `EvalService`.

### Out of scope for Phase 62

- Live Salesforce, Zendesk, NetSuite adapters (Phase 61 deferred scope, not a Phase 62 concern)
- Multi-region deployment and CDN
- Billing / usage metering (separate product concern)
- Webhook push delivery for async eval results
- SDK version > 0.1.0 (v1 is the install-and-score surface; streaming proposals, bulk scoring, etc. are future)
- OpenTelemetry collector integration (routes traces from OTEL pipelines into the public API — v2+ concern)
</domain>

<decisions>
## Implementation Decisions

### Decision 1 — Tenant isolation via additive `tenant_id` migration

Every v2.5 table produced by Phases 57–61 (`eval_runs`, `eval_run_examples`, `seal_proposals`, `seal_proposal_decisions`, `seal_audit_log`, `agent_instructions`, `proposed_skills`, `agent_tool_routing_policies`, `business_outcome_events`) needs `tenant_id` for cross-tenant isolation. Phase 61 already adds `tenant_id TEXT NOT NULL DEFAULT 'default-tenant'` to `business_outcome_events`. Phase 62 adds the same additive column to all other affected tables.

Additive migration pattern (identical to Phase 61):
```sql
ALTER TABLE eval_runs ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
-- (repeat for each table)
```

This is the only safe path given the `initSchema` CRITICAL constraint (no DROP/ALTER that changes existing columns). `ALTER TABLE ... ADD COLUMN` with a DEFAULT is additive and safe in SQLite with better-sqlite3.

Two new tables:
- `tenants (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL)`
- `tenant_api_keys (id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), key_hash TEXT NOT NULL UNIQUE, scopes TEXT NOT NULL DEFAULT 'eval:submit,eval:read,proposals:read', created_at TEXT NOT NULL, revoked_at TEXT)`

All public API routes resolve `tenant_id` from the `Authorization: Bearer <key>` header by looking up `key_hash` in `tenant_api_keys`. The internal "default-tenant" key is a bootstrapped row inserted at schema init.

### Decision 2 — Public API versioning and path separation

Internal eval routes live at `/api/evals/*` and `/api/seal/*`. The public surface lives at `/api/public/v1/*` to make versioning explicit and isolate the external contract from internal routes. If the internal routes change shape, the public surface can absorb the difference in the route handler without a customer-visible breaking change.

Public route layout:
- `POST /api/public/v1/eval` — submit a trace (OpenInference or MemroOS JSON); returns `{runId, w, layers, proposalIds[]}`
- `GET  /api/public/v1/eval/[runId]` — retrieve a scored run result; tenant-scoped
- `GET  /api/public/v1/proposals` — list queued proposals for the tenant; optional `?traceId=` filter
- `GET  /api/public/v1/proposals/[proposalId]` — retrieve a single proposal with diff and W-delta forecast; tenant-scoped

All routes: `Authorization: Bearer <api_key>` header required. Responses follow existing Memroos `Response.json()` convention. Rate limit headers on every response.

### Decision 3 — OpenInference format mapping

OpenInference is pinned to `openinference-semantic-conventions` v0.1.x (the latest stable as of 2026-05-15). The mapper lives at `apps/memroos/src/lib/evals/openinference-mapper.ts`. It converts an OpenInference `SpanAttributes` object (or a simplified flat JSON object following the same attribute names) into an `AgentEvalTrace`.

Key mappings:
| OpenInference attribute | AgentEvalTrace field |
|---|---|
| `openinference.span.kind` | (used to validate it's an `AGENT` or `LLM` span) |
| `input.value` | `input` |
| `output.value` | `output` |
| `llm.model_name` | `agentModel` |
| `session.id` or `trace.id` | `traceId` |
| `metadata.agent_id` (custom) | `agentId` |
| `llm.token_count.total` → cost heuristic | `outcome.costUsd` (estimated) |

The MemroOS JSON format is `AgentEvalTrace` as defined in `apps/memroos/src/lib/evals/types.ts`. The `POST /api/public/v1/eval` handler detects format by inspecting for `openinference.span.kind` at the root; if absent, it treats the payload as MemroOS JSON. Both paths call the same `EvalService.scoreAndMaybePersistEvalTrace()`.

### Decision 4 — SDK structure: monorepo packages, publishable externally

Both SDKs live in the monorepo so Phase 59/60 can dogfood them via local workspace resolution, but they are structured as standalone publishable packages so external customers can `pip install memroos` or `npm i @memroos/sdk`.

- `packages/sdk-ts/` — TypeScript SDK
  - `package.json`: `name: "@memroos/sdk"`, `version: "0.1.0"`, `main: "dist/index.js"`, `types: "dist/index.d.ts"`, `peerDependencies: { "node": ">=18" }`
  - `src/client.ts` — `MemroosClient(baseUrl: string, apiKey: string)` with `submitTrace(trace: AgentEvalTrace | OpenInferenceTrace): Promise<EvalSubmitResult>`, `getRunResult(runId: string): Promise<EvalRunResult>`, `listProposals(filter?: ProposalFilter): Promise<Proposal[]>`
  - `src/types.ts` — re-exports `AgentEvalTrace` type, defines `EvalSubmitResult`, `ProposalFilter`, `Proposal`, `OpenInferenceTrace`
  - `src/smoke-test.ts` — runnable quickstart script (the one the customer docs point to); imports a bundled sample trace and sample golden set, submits, asserts W is a number
  - Workspace reference in `apps/memroos/package.json`: `"@memroos/sdk": "workspace:../../../packages/sdk-ts"`

- `packages/sdk-py/` — Python SDK
  - `pyproject.toml`: `name = "memroos"`, `version = "0.1.0"`, Python ≥ 3.10
  - `memroos/client.py` — `MemroosClient(base_url: str, api_key: str)` with `submit_trace()`, `get_run_result()`, `list_proposals()`; uses `httpx` for async, `dataclasses` for response types
  - `memroos/types.py` — `AgentEvalTrace` dataclass mirroring the TypeScript type
  - `memroos/smoke_test.py` — same quickstart script logic as the TS version
  - Workspace reference from Phase 59/60 Python code: `pip install -e ../../packages/sdk-py` in relevant pyproject or requirements

### Decision 5 — Phase 59/60 dogfood refactor

Success criterion API-06 requires that "the Phase 59 memory autogen loop and the Phase 60 agent autogen loop use the public API surface end-to-end (not an internal-only path)." This means changing existing Phase 59/60 code.

Concretely:
- Any call to `EvalService.runForTrace()` or `scoreAndMaybePersistEvalTrace()` in SEAL Phase 58's `apply.ts` or any Phase 59/60 module that evaluates a mutation is replaced with `memroosClient.submitTrace(trace)` followed by `memroosClient.getRunResult(runId)`.
- The `MemroosClient` instance in these callers is configured with `baseUrl: process.env.MEMROOS_PUBLIC_API_URL ?? 'http://localhost:3000'` so the localhost call round-trips through the HTTP surface without leaving the machine during development.
- Existing direct imports of `EvalService` that are NOT part of the autogen loop (e.g. the `/api/evals` internal routes) are left unchanged — only the SEAL apply/rerun path is refactored.
- A new integration test in `apps/memroos/src/__tests__/e2e/dogfood-api.test.ts` starts the Memroos server, runs the Phase 59 memory loop and Phase 60 agent loop using only SDK calls, and asserts end-to-end W values are returned.

### Decision 6 — Rate limiting implementation

Token-bucket rate limiting per `tenant_id`, implemented as Next.js middleware in `apps/memroos/src/middleware.ts` (or extended if middleware already exists). Config: `memroos.eval.yaml` gets a new `public_api.rate_limit` block:

```yaml
public_api:
  rate_limit:
    requests_per_minute: 60
    burst: 10
```

Middleware uses an in-memory LRU map of `{tenantId: {tokens, lastRefill}}`. For production deployments, the comment block documents that Redis-backed rate limiting is needed for multi-instance; in-memory is correct for single-instance (the v1 target).

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` on every public API response.

### Decision 7 — Phase 61 `tenant_id` coupling

Phase 61 introduces `tenant_id TEXT NOT NULL DEFAULT 'default-tenant'` on `business_outcome_events`. Phase 62 reconciles this with the new `tenants` table by adding a foreign key is not added (SQLite does not enforce FK on existing columns retroactively) — instead the service layer validates `tenant_id` against the `tenants` table at query time. Both CONTEXTs note this coupling.
</decisions>

<code_context>
## Existing Code Insights

- `apps/memroos/src/lib/db-schema.ts` owns `initSchema` — CRITICAL symbol (all DB routes initialize through it). Phase 62 adds two new tables and `ALTER TABLE ... ADD COLUMN` statements for eight existing tables. Run `gitnexus_impact({target: "initSchema", direction: "upstream"})` before editing.
- `apps/memroos/src/lib/evals/types.ts` defines `AgentEvalTrace` — this is the MemroOS JSON format. OpenInference mapper translates to this type; no new trace schema introduced.
- `apps/memroos/src/lib/evals/service.ts` exports `EvalService` and `scoreAndMaybePersistEvalTrace()`. The public API handler calls these; Phase 59/60 dogfood callers are refactored to call the SDK instead.
- `apps/memroos/src/lib/evals/config.ts` parses `memroos.eval.yaml`. Phase 62 extends it to parse the new `public_api:` block.
- `apps/memroos/src/lib/operator-auth.ts` handles internal operator authentication for Memroos UI routes. Phase 62's per-tenant API key auth for public routes is a separate middleware, not mixed with operator auth.
- `apps/memroos/src/lib/api-client.ts` handles internal TanStack Query hooks. Phase 62 does not add hooks to this file (SDK callers use the SDK, not internal API client).
- `apps/memroos/src/lib/seal/apply.ts` is the Phase 58 module that calls `EvalService.runForTrace()` — this is one of the callers to refactor for dogfood (task 9).
- Golden sets live at `golden-sets/` in the repo root. Phase 62's quickstart sample re-uses the existing `golden-sets/business-ops-50.jsonl`.
- `packages/` directory exists at repo root (monorepo workspace) — confirm with `ls <repo-root>/packages/` before creating SDK packages.
- Rate limiting middleware location: check for existing `apps/memroos/src/middleware.ts` before creating; extend if present.
</code_context>

<specifics>
## Specific Ideas

### New tables (additive DDL in `initSchema`)

```sql
-- tenants
CREATE TABLE IF NOT EXISTS tenants (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
INSERT OR IGNORE INTO tenants (id, name) VALUES ('default-tenant', 'Default Tenant');

-- tenant_api_keys
CREATE TABLE IF NOT EXISTS tenant_api_keys (
  id          TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key_hash    TEXT NOT NULL UNIQUE,
  scopes      TEXT NOT NULL DEFAULT 'eval:submit,eval:read,proposals:read',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  revoked_at  TEXT
);
CREATE INDEX IF NOT EXISTS tak_tenant ON tenant_api_keys(tenant_id);
CREATE INDEX IF NOT EXISTS tak_hash   ON tenant_api_keys(key_hash);
```

Additive column migrations (ALTER TABLE, one per existing v2.5 table):
```sql
ALTER TABLE eval_runs              ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE eval_run_examples      ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE seal_proposals         ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE seal_proposal_decisions ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE seal_audit_log         ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE agent_instructions     ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE proposed_skills        ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
ALTER TABLE agent_tool_routing_policies ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default-tenant';
```
(Note: `business_outcome_events` already has `tenant_id` from Phase 61.)

### New library modules

`apps/memroos/src/lib/public-api/`
- `tenant-auth.ts` — `resolveTenant(authHeader: string | null, db): {tenantId: string, scopes: string[]} | null`; hashes the bearer token (SHA-256), queries `tenant_api_keys`, checks `revoked_at` is null
- `rate-limiter.ts` — token-bucket per tenantId; `checkRateLimit(tenantId: string): RateLimitResult`; reads config from `memroos.eval.yaml` `public_api.rate_limit`; LRU map with 1000-key cap

`apps/memroos/src/lib/evals/openinference-mapper.ts`
- `isOpenInferenceTrace(payload: unknown): boolean` — detects `openinference.span.kind` at root
- `mapOpenInferenceToAgentEvalTrace(span: OpenInferenceSpan): AgentEvalTrace` — attribute mapping table per Decision 3
- `OpenInferenceSpan` type (local; mirrors the flat attribute bag from openinference-semantic-conventions v0.1.x)

### Public API routes

- `apps/memroos/src/app/api/public/v1/eval/route.ts` — POST: resolve tenant, check rate limit, detect format, map to `AgentEvalTrace`, call `scoreAndMaybePersistEvalTrace()` with `tenantId`, return `{runId, w, layers, proposalIds}`
- `apps/memroos/src/app/api/public/v1/eval/[runId]/route.ts` — GET: resolve tenant, verify run belongs to tenant, return `EvalRunResult`
- `apps/memroos/src/app/api/public/v1/proposals/route.ts` — GET: resolve tenant, list `seal_proposals` scoped to tenant, optional `?traceId=` filter
- `apps/memroos/src/app/api/public/v1/proposals/[proposalId]/route.ts` — GET: resolve tenant, verify proposal belongs to tenant, return proposal with diff and W-delta

### SDK packages

`packages/sdk-ts/`
- `src/client.ts` — `MemroosClient` class
- `src/types.ts` — exported types
- `src/smoke-test.ts` — quickstart script
- `src/index.ts` — barrel export
- `tsconfig.json`, `package.json` (name: `@memroos/sdk`, version: `0.1.0`)
- `__tests__/client.test.ts` — unit tests mocking the HTTP surface

`packages/sdk-py/`
- `memroos/__init__.py` — exports `MemroosClient`
- `memroos/client.py` — `MemroosClient` class (async via httpx)
- `memroos/types.py` — `AgentEvalTrace` dataclass, `EvalSubmitResult`, `Proposal`
- `memroos/smoke_test.py` — quickstart script
- `pyproject.toml` (name: `memroos`, version: `0.1.0`)
- `tests/test_client.py` — unit tests mocking HTTP with `respx`

### Quickstart doc

`docs/eval-quickstart.md` — five-minute guide with:
1. Create API key (Memroos UI `Settings > API Keys`)
2. Install SDK (`pip install memroos` or `npm i @memroos/sdk`)
3. Copy code snippet that submits a sample trace
4. Show the W score and layer breakdown printed to console
5. Link to full API reference

### Config surface addition to `memroos.eval.yaml`

```yaml
public_api:
  rate_limit:
    requests_per_minute: 60
    burst: 10
```

### Tests

- `tenant-auth.ts`: valid key resolves tenant; revoked key returns null; unknown key returns null
- `rate-limiter.ts`: under-limit passes; over-limit returns 429 headers; refill window resets tokens
- OpenInference mapper: known OpenInference span attributes map to expected `AgentEvalTrace` fields; non-OpenInference payload is detected as MemroOS JSON
- Public API POST `eval`: MemroOS JSON path → returns W; OpenInference path → returns W; missing auth → 401; rate-limited → 429; cross-tenant access → 403
- Public API GET `eval/[runId]`: known run for correct tenant → 200; known run for wrong tenant → 403
- Public API GET `proposals`: returns only tenant-scoped proposals
- SDK TypeScript: `submitTrace()` serializes and deserializes correctly; `getRunResult()` returns typed result
- SDK Python: `submit_trace()` async, correct HTTP call; `get_run_result()` returns dataclass
- Dogfood integration test: Phase 59 memory loop + Phase 60 agent loop both complete using only SDK calls; both return `EvalRunResult` with numeric W
- Tenant isolation: test asserts no cross-tenant row leakage across all four public API routes
</specifics>

<deferred>
## Deferred Ideas

- Redis-backed rate limiting for multi-instance deployments (in-memory LRU is correct for v1 single-instance)
- Webhook push delivery for async proposal notifications
- Streaming eval results (chunked or SSE) — future SDK v2
- OpenTelemetry collector bridge (route OTEL traces directly into public API)
- Bulk trace submission endpoint
- SDK versions beyond 0.1.0; semantic versioning automation
- Billing / usage metering
- Multi-region isolation at the storage layer
- SDK for other languages (Go, Ruby — customer request driven)
- UI for tenant API key management (quickstart uses a CLI script to generate; full UI is a later addition to the Settings page)
</deferred>
