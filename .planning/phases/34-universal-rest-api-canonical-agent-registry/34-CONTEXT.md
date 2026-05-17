# Phase 34: Universal REST API + Canonical Agent Registry - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning
**Source:** Resume from interrupted planning gate; user asked to continue full Phase 34 scope

<domain>
## Phase Boundary

Phase 34 creates the canonical agent registry foundation for v2.0. It must replace the current split between file-backed local agents and `agents.config.json` remote agents with one SQLite-backed registry model and service layer. REST, future A2A, and UI registration are adapters onto that same service.

This phase owns:
- DB schema and TypeScript service layer for registered agents, capabilities, heartbeats, API keys, skill reports, memory write audit, and tool outcome write audit.
- Framework-agnostic REST writes for heartbeat, skill reports, memory adds, and tool-attention outcome records.
- Per-agent API key authentication for all Phase 34 write endpoints.
- Memroos Agent Registry UI with register/deregister behavior.
- Flow and Memroos roster reads from the canonical registry rather than hardcoded/file-backed agent IDs.

This phase does not own:
- A2A protocol endpoints, agent cards, task lifecycle, or Google ADK adapters. Those begin in Phase 35.
- LangGraph routing, HIL decisions, or orchestration persistence. Those begin in Phase 36.
- Unified vector/graph/episodic memory routing beyond an authenticated `/api/memory/add` baseline. Full memory tier routing begins in Phase 37.
- Docker/setup/docs/OSS polish. Those remain Phases 38-41.
</domain>

<decisions>
## Implementation Decisions

### Scope
- Use one canonical SQLite-backed registry service as the only mutation path for agent lifecycle state.
- Keep existing read surfaces backward-compatible where practical: `/api/agents`, `/api/remote-agents`, dispatch card endpoints, Memroos Floor, Voice, Dispatch, and Flow should keep working while reading from the canonical service.
- Register and deregister from UI through the same service functions future A2A registration will call.
- Store remote connection metadata as nullable columns or JSON on the registered agent record; do not keep a separate remote-agent config model as the canonical source.
- Treat local/file-backed discovery as a transitional import/adapter only. It may seed registry records, but source code should not contain hardcoded agent identifiers after this phase.

### Auth And Keys
- Use per-agent API keys for all REST write endpoints: `POST /api/heartbeat`, `POST /api/skills/report`, `POST /api/memory/add`, and `POST /api/tool-attention/record`.
- Store only API key hashes in SQLite. Return the plaintext key once at registration or rotation.
- Accept API keys via `Authorization: Bearer <key>` as the canonical transport. Support `X-Agent-Id` only as identity hint, not as proof.
- Keep local single-user UI registration unauthenticated for now, matching project scope, but every machine-to-machine write must enforce per-agent keys.

### REST Behavior
- `POST /api/agents/register` creates or upserts an agent and returns the registry record plus one-time API key when requested.
- `DELETE /api/agents/:id` or equivalent deregisters by setting status/deregistered timestamp rather than hard-deleting audit history.
- `POST /api/heartbeat` updates `last_heartbeat_at`, status, optional current task, runtime metadata, and remote latency if supplied.
- `POST /api/skills/report` records skill usage against an authenticated agent and updates capability/skill summaries.
- `POST /api/memory/add` authenticates the agent, forwards to the current mem0 endpoint for the baseline write, and records an audit row tying the write to the agent.
- `POST /api/tool-attention/record` authenticates the agent, appends through the existing tool-attention writer path, and records the agent context in metadata.

### UI And Flow
- Add a real Agent Registry page using the existing restrained operational dashboard language: dense list/table plus details drawer/form, not a marketing page.
- Memroos Floor may continue to show cards, but cards should be grouped from registry fields rather than platform-specific hardcoded sections.
- Flow must remove `KEY_AGENT_IDS`, fixed named remote-agent icons, and hardcoded gateway subtitles where they represent agents. System infrastructure nodes can remain static when they are not agent roster entries.
- Flow agent nodes should be derived from registered agents with stable layout rules and graceful overflow.
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap And Requirements
- `.planning/ROADMAP.md` - Phase 34 goal, success criteria, dependencies, and v2.0 phase boundary.
- `.planning/REQUIREMENTS.md` - REST-01..06 and REG-00..03 requirement definitions.
- `.planning/STATE.md` - Carry-forward architectural constraints, especially Qdrant Cloud, mem0 write path, and separate future LangGraph DB.

### Existing Registry And API Surfaces
- `apps/memroos/src/lib/agent-registry.ts` - Current file-backed remote-agent registry adapter to replace.
- `apps/memroos/src/app/api/agents/route.ts` - Current local agent read endpoint.
- `apps/memroos/src/app/api/remote-agents/route.ts` - Current remote agent read endpoint.
- `apps/memroos/src/app/api/heartbeat/route.ts` - Current read-only file heartbeat endpoint; Phase 34 adds authenticated POST.
- `apps/memroos/src/app/api/skills/route.ts` - Current skills read endpoint; Phase 34 adds authenticated report route.
- `apps/memroos/src/app/api/memory/route.ts` - Current memory read/search endpoint; Phase 34 adds authenticated POST baseline.
- `apps/memroos/src/app/api/tool-attention/route.ts` - Current tool-attention read endpoint; Phase 34 adds authenticated outcome record route.

### Existing DB And UI Patterns
- `apps/memroos/src/lib/db-schema.ts` - SQLite schema initialization and additive migration pattern.
- `apps/memroos/src/lib/db.ts` - Shared `better-sqlite3` singleton.
- `apps/memroos/src/components/memroos/agent-card.tsx` - Existing agent card presentation.
- `apps/memroos/src/components/memroos/agent-grid.tsx` - Existing grouped agent roster.
- `apps/memroos/src/app/page.tsx` - Memroos Floor composition and local/remote merge logic to remove.
- `apps/memroos/src/app/flow/page.tsx` - Flow page data wiring.
- `apps/memroos/src/components/flow/flow-canvas.tsx` and `apps/memroos/src/components/flow/react-flow-canvas.tsx` - Flow agent node construction and hardcoded roster patterns.
</canonical_refs>

<specifics>
## Specific Ideas

- Use `crypto.randomBytes(32).toString("base64url")` for generated agent API keys and SHA-256 for stored hashes.
- Add test helpers that create a temp SQLite DB via `process.env.SQLITE_DB_PATH`, mirroring existing DB tests.
- Preserve `dynamic = "force-dynamic"` on registry/read routes that should reflect live state.
- Prefer route tests for auth failures and service unit tests for registry behavior.
- Keep status derivation deterministic: active if last heartbeat is within a freshness window, dormant if stale, error if explicitly reported.
</specifics>

<deferred>
## Deferred Ideas

- A2A registration adapter and A2A agent cards are deferred to Phase 35.
- LangGraph capability routing is deferred to Phase 36.
- Full memory tier routing and Neo4j/mem0 graph behavior are deferred to Phase 37.
- Public REST reference docs are deferred to Phase 40, though this phase should leave endpoint contracts easy to document.
</deferred>

---

*Phase: 34-universal-rest-api-canonical-agent-registry*
*Context gathered: 2026-05-05 via resumed planning gate*
