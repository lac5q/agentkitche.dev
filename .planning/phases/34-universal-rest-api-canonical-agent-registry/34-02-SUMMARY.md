---
phase: 34
plan: 02
title: Authenticated Universal REST Write API
status: complete
completed: 2026-05-05
requirements: [REST-01, REST-02, REST-03, REST-04, REST-05, REST-06, REG-00]
---

# Phase 34 Plan 02 — Authenticated Universal REST Write API: Summary

## Outcome

Framework-agnostic REST writes now authenticate with per-agent bearer keys and write through the canonical registry service. Registration, heartbeat, skill reports, memory writes, and tool-attention outcomes are covered by route tests, including a curl-like register → heartbeat → list flow.

## Performance

- **Duration:** 12 min
- **Started:** 2026-05-05T06:46:40Z
- **Completed:** 2026-05-05T06:51:23Z
- **Tasks:** 4
- **Files modified:** 13

## What Was Done

### Registry routes

- `GET /api/agents` now reads canonical registered agents from SQLite.
- `POST /api/agents/register` validates registration payloads, creates/upserts agents, and returns one-time API keys by default.
- `GET /api/agents/[id]` returns one canonical agent.
- `DELETE /api/agents/[id]` soft-deregisters an agent and revokes its keys.

### Authenticated write routes

- `POST /api/heartbeat` authenticates a bearer key and updates canonical liveness state.
- `POST /api/skills/report` authenticates a bearer key and appends skill report audit rows.
- `POST /api/memory/add` authenticates a bearer key, forwards the body to mem0 `/memory/add`, and records a write audit row.
- `POST /api/tool-attention/record` authenticates a bearer key, appends existing tool-attention JSONL format, and records a DB audit row.

### Tool outcome append helper

Added `appendToolAttentionOutcome` in `apps/memroos/src/lib/tool-attention.ts` so the route writes through the same JSONL source that existing tool-attention analytics read.

## Verification

- `npm --prefix apps/memroos run test -- src/app/api/agents/__tests__/registry-route.test.ts src/app/api/heartbeat/__tests__/route.test.ts src/app/api/skills/__tests__/report-route.test.ts src/app/api/memory/__tests__/add-route.test.ts src/app/api/tool-attention/__tests__/record-route.test.ts` — **16 passed**
- `npm --prefix apps/memroos run test -- src/app/api/agents/__tests__/card.test.ts src/app/api/remote-agents/route.ts src/app/api/tool-attention/__tests__/route.test.ts` — **6 passed** with one pre-existing Vitest hoist warning
- `npm --prefix apps/memroos run lint -- ...` targeted Wave 2 files — **passed**
- `git diff --check -- apps/memroos/src/app/api apps/memroos/src/lib/agent-registry.ts apps/memroos/src/lib/tool-attention.ts` — **passed**
- `gitnexus api_impact` for `/api/agents`, `/api/heartbeat`, `/api/remote-agents`, `/api/skills`, `/api/memory`, and `/api/tool-attention` — **LOW risk** except unrelated existing `/api/memory-consolidate` shape mismatch noted by GitNexus
- `gitnexus detect_changes` — **medium risk**, expected route/tool-attention changes

## Files Changed

- `apps/memroos/src/app/api/agents/route.ts` — canonical registry read
- `apps/memroos/src/app/api/agents/register/route.ts` — registration endpoint
- `apps/memroos/src/app/api/agents/[id]/route.ts` — get/deregister endpoint
- `apps/memroos/src/app/api/heartbeat/route.ts` — authenticated heartbeat POST
- `apps/memroos/src/app/api/skills/report/route.ts` — authenticated skill report endpoint
- `apps/memroos/src/app/api/memory/add/route.ts` — authenticated mem0 write baseline
- `apps/memroos/src/app/api/tool-attention/record/route.ts` — authenticated tool outcome endpoint
- `apps/memroos/src/lib/agent-registry.ts` — shared header authentication helper
- `apps/memroos/src/lib/tool-attention.ts` — JSONL append helper
- Route tests under `apps/memroos/src/app/api/**/__tests__`

## Decisions Made

- Used `Authorization: Bearer <key>` as the single proof of agent identity.
- Treated request-body `agentId` only as a hint that must match the bearer key identity.
- Kept existing GET response shapes intact for heartbeat, skills, memory, and tool-attention reads.
- Kept memory tier routing out of scope; `/api/memory/add` forwards to the current mem0 baseline.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- The heartbeat test file had a full mock for `@/lib/constants`; POST tests needed DB constants too. Converted that mock to a partial mock via `importOriginal`.
- Existing `card.test.ts` still emits a Vitest warning about nested `vi.mock` hoisting. It is pre-existing and non-blocking.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Plan 34-03 can now build the Registry UI and migrate Memroos Floor/Flow against canonical `/api/agents` data. The write API and auth contract are in place.

---
*Phase: 34-universal-rest-api-canonical-agent-registry*
*Completed: 2026-05-05*
