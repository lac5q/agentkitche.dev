---
phase: 34
plan: 01
title: Canonical Registry Schema, Service, And API Keys
status: complete
completed: 2026-05-05
requirements: [REG-00, REST-05, REST-06]
---

# Phase 34 Plan 01 — Canonical Registry Schema, Service, And API Keys: Summary

## Outcome

The canonical agent registry foundation is now SQLite-backed. Agents can be registered, listed, authenticated with hashed one-time API keys, soft-deregistered, updated by heartbeat, and exposed through the existing remote-agent compatibility shape without reading `agents.config.json` as canonical state.

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-05T06:42:14Z
- **Completed:** 2026-05-05T06:45:18Z
- **Tasks:** 3
- **Files modified:** 4

## What Was Done

### Task A — Registry service tests

Added `apps/memroos/src/lib/__tests__/agent-registry.test.ts` covering:

- registration with capabilities
- one-time API key issue
- no plaintext key storage in DB rows
- public list DTO redaction
- valid and invalid API key authentication
- heartbeat status/current-task/metadata updates
- soft deregistration and key revocation
- `RemoteAgentConfig` compatibility mapping

The tests were red before implementation with `registerAgent is not a function`, then passed after the service landed.

### Task B — Canonical registry tables

Added additive SQLite tables in `apps/memroos/src/lib/db-schema.ts`:

- `registered_agents`
- `agent_api_keys`
- `agent_capabilities`
- `agent_skill_reports`
- `agent_memory_writes`
- `agent_tool_outcomes`

The existing DB schema remains untouched; new tables use `CREATE TABLE IF NOT EXISTS` and indexes for status, protocol, key hash, capabilities, and write-audit lookup.

### Task C — Registry service implementation

Replaced `apps/memroos/src/lib/agent-registry.ts` with DB-backed service methods:

- `registerAgent`
- `listRegisteredAgents`
- `getRegisteredAgent`
- `deregisterAgent`
- `createAgentApiKey`
- `authenticateAgentKey`
- `recordHeartbeat`
- `recordSkillReport`
- `recordMemoryWrite`
- `recordToolOutcome`
- `getRemoteAgents`
- `pollRemoteAgent`
- `pollAllRemoteAgents`

Added registry types in `apps/memroos/src/types/index.ts` for protocol, canonical agent DTOs, registration input, registration result, and heartbeat input.

## Verification

- `npm --prefix apps/memroos run test -- src/lib/__tests__/agent-registry.test.ts` — **6 passed**
- `npm --prefix apps/memroos run test -- src/lib/__tests__/db.test.ts src/lib/__tests__/agent-registry.test.ts` — **12 passed**
- `npm --prefix apps/memroos run lint -- src/lib/agent-registry.ts src/lib/db-schema.ts src/types/index.ts src/lib/__tests__/agent-registry.test.ts` — **passed**
- `gitnexus impact initSchema` — **CRITICAL blast radius**, mitigated by additive-only schema changes and DB regression tests
- `gitnexus impact getRemoteAgents` — **HIGH blast radius**, mitigated by preserving the export and compatibility DTO shape
- `gitnexus detect_changes` — **medium risk**, affected registry/dispatch remote-agent flows as expected

## Files Changed

- `apps/memroos/src/lib/db-schema.ts` — adds canonical registry and audit tables
- `apps/memroos/src/lib/agent-registry.ts` — DB-backed registry service and remote compatibility wrapper
- `apps/memroos/src/types/index.ts` — registry DTO and request types
- `apps/memroos/src/lib/__tests__/agent-registry.test.ts` — service coverage for registry lifecycle and keys

## Decisions Made

- Stored only SHA-256 API key hashes; plaintext keys are returned once from registration/key creation.
- Kept `getRemoteAgents()` as a compatibility wrapper to protect Dispatch and agent-card consumers until later waves migrate UI reads.
- Used soft deregistration plus key revocation rather than deleting agent rows.
- Used JSON text columns for flexible metadata that future A2A adapters can extend.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The first test command used a repo-root path while `npm --prefix apps/memroos` runs Vitest from the app directory. Re-ran with `src/lib/__tests__/agent-registry.test.ts`, which correctly found the test file.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 34-02 can now implement REST write routes against the canonical service. The key primitives and audit tables exist, and remote-agent consumers still have their compatibility function.

---
*Phase: 34-universal-rest-api-canonical-agent-registry*
*Completed: 2026-05-05*
