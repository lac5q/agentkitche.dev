# Phase 34: Universal REST API + Canonical Agent Registry - Research

**Researched:** 2026-05-05
**Domain:** Next.js route handlers, better-sqlite3 registry model, per-agent API key authentication, operational UI
**Confidence:** HIGH

## Summary

Memroos already has most of the read-side surfaces Phase 34 needs, but they are split across filesystem parsing and a JSON config file. Local agents come from `parseAgents(AGENT_CONFIGS_PATH)` in `/api/agents`. Remote agents come from `apps/memroos/src/lib/agent-registry.ts`, which reads `agents.config.json` and polls each configured remote health endpoint. Memroos Floor merges those two shapes in the browser, and Flow has explicit key-agent IDs, emoji/icon mappings, and static subtitles embedded in component code.

The durable fix is to introduce a canonical registry service below all adapters. The DB schema should live in `db-schema.ts`, access should live in a focused `agent-registry.ts` service, and both old and new route handlers should use that service. This lets Phase 35 implement A2A registration as another adapter without changing the UI again.

## Current State Inventory

| Area | Current State | Phase 34 Change |
|------|---------------|-----------------|
| Agent data | Local file parse plus remote JSON config | Canonical SQLite records with optional imported/source metadata |
| Remote polling | `getRemoteAgents()` reads config file and polls health endpoints | Registry service lists remote-capable agents; polling updates heartbeat/status through service |
| Heartbeat | GET reads `HEARTBEAT_STATE.md` from agent config dir | POST authenticates agent and updates registry heartbeat; GET can remain compatibility/read-only |
| Skills | GET aggregates local skill dirs/logs | Add authenticated report route that records per-agent skill usage |
| Memory | GET proxies mem0 search and parses Claude memory | Add authenticated POST baseline that forwards to mem0 `/memory/add` and audits registry agent |
| Tool attention | GET returns catalog and outcomes | Add authenticated POST/record route that appends existing outcome format with agent metadata |
| UI | Memroos Floor card grid; no dedicated registry CRUD | Add registry page plus register/deregister controls |
| Flow | Static agent roster assumptions | Build agent nodes dynamically from registry response |

## Recommended Architecture

### DB Model

Add tables with additive `CREATE TABLE IF NOT EXISTS` migrations:

- `registered_agents`: canonical identity and lifecycle fields.
- `agent_api_keys`: key hash, prefix, created/last-used/revoked fields.
- `agent_capabilities`: normalized capabilities/skills declared by the agent.
- `agent_skill_reports`: append-only usage reports from `/api/skills/report`.
- `agent_memory_writes`: audit rows for authenticated `/api/memory/add`.
- `agent_tool_outcomes`: audit rows for authenticated `/api/tool-attention/record` if the JSONL log remains the source of tool-attention analytics.

Use JSON text columns for flexible metadata where the shape will evolve in Phase 35, but keep top-level fields queryable: `id`, `name`, `role`, `protocol`, `platform`, `location`, `status`, `last_heartbeat_at`, `created_at`, `updated_at`, `deregistered_at`.

### Service Layer

`apps/memroos/src/lib/agent-registry.ts` should become the service boundary:

- `registerAgent(input)` creates/upserts an agent, stores capabilities, optionally creates an API key, and returns a public agent DTO.
- `listAgents(options)` returns canonical agents with derived status and capability summaries.
- `getAgent(id)` returns one public agent DTO.
- `deregisterAgent(id)` marks the record deregistered and revokes active keys.
- `authenticateAgentKey(rawKey, agentIdHint?)` verifies SHA-256 hash using timing-safe comparison where practical.
- `recordHeartbeat(agent, payload)` updates liveness and runtime metadata.
- `recordSkillReport(agent, payload)` appends usage and updates capability summaries.
- `recordMemoryWrite(agent, payload, result)` audits memory writes.
- `recordToolOutcome(agent, payload)` appends the existing tool-attention outcome and audits it.

Keep legacy exports (`getRemoteAgents`, `pollAllRemoteAgents`) temporarily as compatibility wrappers over canonical records so dispatch/voice/agent-card panels can migrate incrementally.

### Auth Contract

Use `Authorization: Bearer <agent_api_key>` on all machine write routes. The key is scoped to one registered agent. Store only hashes and return plaintext exactly once when generated. On success, update `last_used_at`; on failure, return 401 with a generic body.

Do not accept arbitrary `agentId` request body fields as proof of identity. Body `agentId` may be used for compatibility only after the bearer key authenticates to the same identity.

### REST Contracts

| Endpoint | Method | Auth | Primary Service Call |
|----------|--------|------|----------------------|
| `/api/agents` | GET | none | `listAgents()` |
| `/api/agents/register` | POST | local UI/no agent key | `registerAgent()` |
| `/api/agents/[id]` | GET/DELETE | none for local UI | `getAgent()` / `deregisterAgent()` |
| `/api/heartbeat` | POST | bearer agent key | `recordHeartbeat()` |
| `/api/skills/report` | POST | bearer agent key | `recordSkillReport()` |
| `/api/memory/add` | POST | bearer agent key | forward to mem0 and `recordMemoryWrite()` |
| `/api/tool-attention/record` | POST | bearer agent key | existing outcome append plus `recordToolOutcome()` |

### UI Contract

Add `apps/memroos/src/app/agents/page.tsx` and focused registry components. The first screen should be the actual registry: summary row, filters, list/table, registration form, and per-agent details/actions. Keep it compact and work-focused. Use existing dark operational dashboard patterns, but avoid nesting cards inside cards.

Memroos Floor can continue to use `AgentGrid`, but sections should be produced from registry fields, not hardcoded platform families. Flow should receive registered agent summaries and compute nodes from the registry list.

## Validation Architecture

Phase 34 needs both service and route validation:

- Unit tests for registry service CRUD, API key hash verification, deregistration, and heartbeat status derivation.
- Route tests proving missing/invalid bearer keys reject writes for heartbeat, skills report, memory add, and tool-attention record.
- Route tests proving a curl-like registration plus heartbeat path makes the agent appear in `/api/agents`.
- Component tests proving the registry page renders agents and invokes deregistration.
- Static grep checks for removed hardcoded agent roster constants in Flow.
- Build/typecheck/lint/test suite after implementation.

## Risks And Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| UI and A2A later diverge | REG-00 failure | Make the service the only write boundary and test that UI route calls it |
| Plaintext API key leakage | Security issue | Hash in DB, one-time return, redact in DTOs/tests |
| Breaking existing Dispatch/Voice consumers | Regression | Keep compatible `RemoteAgentConfig` DTO/wrappers until consumers migrate |
| SQLite migration damages existing DB | Data loss | Additive tables only; do not alter existing critical tables except safe indexes |
| Tool-attention JSONL and DB audit disagree | Confusing analytics | Treat JSONL append as source for existing analytics; DB audit stores reference/context |

## Files Likely Modified

- `apps/memroos/src/lib/db-schema.ts`
- `apps/memroos/src/lib/agent-registry.ts`
- `apps/memroos/src/types/index.ts`
- `apps/memroos/src/app/api/agents/route.ts`
- `apps/memroos/src/app/api/agents/register/route.ts`
- `apps/memroos/src/app/api/agents/[id]/route.ts`
- `apps/memroos/src/app/api/remote-agents/route.ts`
- `apps/memroos/src/app/api/heartbeat/route.ts`
- `apps/memroos/src/app/api/skills/report/route.ts`
- `apps/memroos/src/app/api/memory/add/route.ts`
- `apps/memroos/src/app/api/tool-attention/record/route.ts`
- `apps/memroos/src/lib/api-client.ts`
- `apps/memroos/src/app/agents/page.tsx`
- `apps/memroos/src/components/agents/*`
- `apps/memroos/src/app/page.tsx`
- `apps/memroos/src/app/flow/page.tsx`
- `apps/memroos/src/components/flow/flow-canvas.tsx`
- `apps/memroos/src/components/flow/react-flow-canvas.tsx`

## Conclusion

Plan Phase 34 as three vertical slices:

1. Canonical registry schema/service/auth.
2. Authenticated REST write endpoints and compatibility reads.
3. Registry UI plus Memroos Floor/Flow roster migration.

This sequence lands REG-00 first, then proves the universal REST API, then removes hardcoded roster assumptions from the user-facing surfaces.

## RESEARCH COMPLETE
