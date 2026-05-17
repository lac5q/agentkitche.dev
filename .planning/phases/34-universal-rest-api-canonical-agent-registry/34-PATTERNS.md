# Phase 34: Pattern Map

**Mapped:** 2026-05-05
**Scope:** Canonical agent registry, REST write routes, Registry UI, Flow roster migration

## Closest Existing Patterns

### SQLite Schema And Access

**Use:** `apps/memroos/src/lib/db-schema.ts`, `apps/memroos/src/lib/db.ts`

Pattern:
- Keep all DDL in `initSchema(db)`.
- Use `CREATE TABLE IF NOT EXISTS` for new tables.
- Use additive migrations guarded by `try/catch` or `meta` flags for one-time rebuilds.
- Keep the shared `better-sqlite3` handle behind `getDb()`.

Phase 34 application:
- Add new registry tables in `db-schema.ts`.
- Add service methods in `agent-registry.ts` that call `getDb()`.
- Tests should set `process.env.SQLITE_DB_PATH` before importing DB modules and call `closeDb()` in teardown.

### Route Handler Tests

**Use:** `apps/memroos/src/app/api/*/__tests__/route.test.ts`

Pattern:
- Use `// @vitest-environment node` where route tests need server APIs.
- Mock service modules where the route contract is being tested.
- Use `NextRequest` for routes that inspect URL/search params.

Phase 34 application:
- Test auth failure and success at route level for heartbeat, skill reports, memory add, and tool-attention record.
- Test registration route with the real service in a temp DB for end-to-end confidence.

### Existing Agent DTOs

**Use:** `apps/memroos/src/types/index.ts`, `apps/memroos/src/components/memroos/agent-card.tsx`

Pattern:
- Browser components consume an `Agent` shape with status, platform, role, last heartbeat, counts, remote metadata, and optional current task.
- Existing card/drawer UI can stay if canonical DTO maps into this shape.

Phase 34 application:
- Extend `Agent` types carefully rather than replacing all consumers.
- Add registry-specific DTOs for API key one-time return and capability arrays.

### Agent Registry Compatibility

**Use:** `apps/memroos/src/lib/agent-registry.ts`, `apps/memroos/src/app/api/dispatch/route.ts`, `apps/memroos/src/components/dispatch/*`

Pattern:
- Dispatch currently expects `RemoteAgentConfig`.
- Voice and Dispatch panels use `useRemoteAgents()` and platform labels.

Phase 34 application:
- Keep `getRemoteAgents()` as a wrapper returning remote-capable registered agents while consumers migrate.
- Add `listRegisteredAgents()` for canonical UI and `/api/agents`.

### UI Page Style

**Use:** `apps/memroos/src/app/library/page.tsx`, `apps/memroos/src/app/cookbooks/page.tsx`, `apps/memroos/src/app/dispatch/page.tsx`

Pattern:
- Page header with amber title and small slate subtitle.
- Operational panels with compact cards/tables.
- Client component pages use React Query hooks from `api-client.ts`.

Phase 34 application:
- Build `app/agents/page.tsx` as a registry dashboard, not a landing page.
- Use filters/tabs/summary metrics and a details drawer/form.
- Keep controls compact and predictable.

### Flow Dynamic Data Wiring

**Use:** `apps/memroos/src/app/flow/page.tsx`, `apps/memroos/src/components/flow/flow-canvas.tsx`

Pattern:
- Page gathers live data with hooks and passes summaries to the canvas.
- Canvas converts summaries to nodes/edges.

Phase 34 application:
- Replace `remoteAgents` plus local counts with registry-derived agent summaries.
- Remove `KEY_AGENT_IDS` and static agent icon maps.
- Keep static infrastructure nodes when they represent services rather than roster entries.

## Anti-Patterns To Avoid

- Do not keep `agents.config.json` as a second canonical registry.
- Do not store plaintext API keys.
- Do not let REST write routes duplicate registration/auth logic.
- Do not hardcode named agent IDs in Flow after the canonical registry exists.
- Do not make Phase 34 responsible for A2A task protocol or LangGraph routing.

## PATTERN MAPPING COMPLETE
