---
phase: 35-a2a-protocol-implementation-google-adk-support
plan: 03
subsystem: api
tags: [a2a, tasks, sqlite, sse, json-rpc, auth]

requires:
  - phase: 35-01-a2a-foundation
    provides: A2A protocol constants, message/task/card types, and error mapping
  - phase: 34-universal-rest-api-canonical-agent-registry
    provides: canonical bearer/API-key identity and authenticated agent registry
provides:
  - Durable SQLite A2A task and task-event storage
  - Authenticated HTTP+JSON A2A task lifecycle routes
  - SSE task streaming and subscription fallback events
  - JSON-RPC compatibility dispatcher for non-streaming A2A methods
affects: [phase-35, phase-36, a2a-delegation, langgraph-orchestration]

tech-stack:
  added: []
  patterns:
    - Additive SQLite task/event schema with ordered per-task event sequence
    - Service-owned bearer identity checks before task access
    - Route handlers delegate protocol behavior to `lib/a2a` services
    - SSE responses use `event: task.update` framing

key-files:
  created:
    - apps/kitchen/src/lib/a2a/task-store.ts
    - apps/kitchen/src/lib/a2a/task-service.ts
    - apps/kitchen/src/lib/a2a/bindings.ts
    - apps/kitchen/src/lib/a2a/__tests__/task-store.test.ts
    - apps/kitchen/src/lib/a2a/__tests__/task-service.test.ts
    - apps/kitchen/src/app/message:send/route.ts
    - apps/kitchen/src/app/message:stream/route.ts
    - apps/kitchen/src/app/tasks/route.ts
    - apps/kitchen/src/app/tasks/[id]/route.ts
    - apps/kitchen/src/app/tasks/[id]:cancel/route.ts
    - apps/kitchen/src/app/tasks/[id]:subscribe/route.ts
    - apps/kitchen/src/app/a2a/route.ts
    - apps/kitchen/src/app/a2a/__tests__/route.test.ts
  modified:
    - apps/kitchen/src/lib/db-schema.ts

key-decisions:
  - "A2A task state lives in Kitchen's main SQLite DB as transport-level state; Phase 36 LangGraph checkpoint state remains separate."
  - "Every task operation binds caller visibility to the authenticated registry agent, ignoring body-provided caller identity."
  - "JSON-RPC supports non-streaming compatibility only; streaming methods direct clients to `/message:stream` or `/tasks/{id}:subscribe`."

patterns-established:
  - "Task routes authenticate at the route boundary and enforce authorization again in `task-service.ts`."
  - "Partial dynamic task-action route files parse IDs from the URL path because Next 16 does not expose `[id]` params for `[id]:cancel` style segments."

requirements-completed: [A2A-02, A2A-07, A2A-08]

duration: 6 min
completed: 2026-05-05
---

# Phase 35 Plan 03: Durable A2A Task API And SSE Streaming Summary

**Authenticated durable A2A task lifecycle with SQLite state, SSE updates, and JSON-RPC compatibility dispatch**

## Performance

- **Duration:** 6 min
- **Started:** 2026-05-05T09:05:06Z
- **Completed:** 2026-05-05T09:11:00Z
- **Tasks:** 4
- **Files modified:** 14

## Accomplishments

- Added durable `a2a_tasks` and `a2a_task_events` tables plus indexes in the additive SQLite schema.
- Implemented task store functions for create, transition, ordered events, lookup, list filtering, and serialization.
- Implemented task service functions for authenticated send/list/get/cancel/stream/subscribe behavior.
- Bound all task operations to Phase 34 bearer/API-key identity and ignored spoofed caller identity from request bodies.
- Reused content scanning and audit logging so blocked task payloads are not persisted and high-severity audit records are written.
- Added A2A HTTP+JSON routes for `message:send`, `message:stream`, task list/get/cancel/subscribe, including SSE `task.update` framing.
- Added `/a2a` JSON-RPC compatibility for `message/send`, `tasks/get`, `tasks/list`, and `tasks/cancel` while rejecting streaming methods with the documented fallback message.

## Task Commits

Each task was committed atomically:

1. **Task A: Add failing A2A task store and service tests** - `61bc0ae6` (test)
2. **Task B: Add durable A2A task/event schema and service modules** - `78c3c7a` (feat)
3. **Task C: Implement HTTP+JSON A2A task routes and SSE streams** - `5bdce9c8`, `8592312b` (test, feat)
4. **Task D: Add lightweight JSON-RPC compatibility dispatcher** - `5e2cdcc5`, `9660d495` (test, feat)
5. **Build type fix** - `fbd4d946` (fix)
6. **Post-wave lint fix** - `839fe53f` (fix)

**Plan metadata:** this summary commit

## Files Created/Modified

- `apps/kitchen/src/lib/db-schema.ts` - Additive A2A task and task-event tables plus indexes.
- `apps/kitchen/src/lib/a2a/task-store.ts` - SQLite persistence and serialization for A2A task state/events.
- `apps/kitchen/src/lib/a2a/task-service.ts` - Authenticated task lifecycle service with scanner/audit integration.
- `apps/kitchen/src/lib/a2a/bindings.ts` - HTTP route constants, JSON-RPC method constants, and non-streaming dispatcher.
- `apps/kitchen/src/lib/a2a/__tests__/task-store.test.ts` - Store tests for persistence, state validation, event sequencing, and visibility filtering.
- `apps/kitchen/src/lib/a2a/__tests__/task-service.test.ts` - Service tests for auth, spoof prevention, task creation, cancellation, and blocked content.
- `apps/kitchen/src/app/message:send/route.ts` - Authenticated A2A send route.
- `apps/kitchen/src/app/message:stream/route.ts` - Authenticated A2A SSE send route.
- `apps/kitchen/src/app/tasks/route.ts` - Authenticated task listing route.
- `apps/kitchen/src/app/tasks/[id]/route.ts` - Authenticated task lookup route.
- `apps/kitchen/src/app/tasks/[id]:cancel/route.ts` - Authenticated task cancellation route.
- `apps/kitchen/src/app/tasks/[id]:subscribe/route.ts` - Authenticated task subscription SSE route.
- `apps/kitchen/src/app/a2a/route.ts` - JSON-RPC compatibility route.
- `apps/kitchen/src/app/a2a/__tests__/route.test.ts` - HTTP+JSON, SSE, and JSON-RPC route tests.

## Decisions Made

- Kept A2A task persistence in the main Kitchen SQLite DB because it is transport-level state and does not overlap with Phase 36's separate LangGraph checkpoint DB.
- Returned not-found-style `A2A task not found` errors when authenticated agents access tasks they neither called nor target, preventing task ID guessing from leaking existence.
- Implemented JSON-RPC as a thin compatibility layer over the same task service rather than a parallel implementation.
- Parsed task IDs from URL paths in `[id]:cancel` and `[id]:subscribe` route handlers because Next 16 build typing treats partial dynamic segments as `{ params: Promise<{}> }`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Adjusted partial dynamic route param handling for Next 16**
- **Found during:** Task D plan-level build verification
- **Issue:** `apps/kitchen/src/app/tasks/[id]:cancel/route.ts` and `[id]:subscribe` used `{ params: Promise<{ id: string }> }`, but Next 16 generated route types expose `{}` for partial dynamic segments.
- **Fix:** Parsed task IDs from `request.url` and loosened context params to `Promise<{}>` while preserving the planned file layout and route tests.
- **Files modified:** `apps/kitchen/src/app/tasks/[id]:cancel/route.ts`, `apps/kitchen/src/app/tasks/[id]:subscribe/route.ts`
- **Verification:** `npm --prefix apps/kitchen run test -- src/app/a2a/__tests__/route.test.ts` and `npm --prefix apps/kitchen run build`
- **Committed in:** `fbd4d946`

**2. [Rule 3 - Blocking] Removed unused context parameters from task action routes**
- **Found during:** Post-wave integration lint gate
- **Issue:** The first Next 16 route-param workaround left unused `_context` parameters typed as `Promise<{}>`, which triggered `@typescript-eslint/no-empty-object-type` errors.
- **Fix:** Removed the context parameter entirely and kept URL-based task ID parsing.
- **Files modified:** `apps/kitchen/src/app/tasks/[id]:cancel/route.ts`, `apps/kitchen/src/app/tasks/[id]:subscribe/route.ts`
- **Verification:** `npm --prefix apps/kitchen run test -- src/app/a2a/__tests__/route.test.ts`, `npm --prefix apps/kitchen run lint`, and `npm --prefix apps/kitchen run build`
- **Committed in:** `839fe53f`

---

**Total deviations:** 2 auto-fixed (2 blocking).
**Impact on plan:** The fix was required for Next 16 type compatibility and did not change the public route contract.

## Issues Encountered

- `initSchema` has CRITICAL GitNexus blast radius because all DB-backed routes call it through `getDb`; the schema change was additive only and verified through DB/task tests plus build.
- `npm --prefix apps/kitchen run typecheck` is listed in the plan but the app has no `typecheck` script. Used `npm --prefix apps/kitchen run build` for TypeScript verification.
- Build still emits the known pre-existing Turbopack NFT warning through `/api/apo`; build exits successfully after the warning.
- Lint still reports 12 pre-existing warnings unrelated to this plan.

## Verification

- `npm --prefix apps/kitchen run test -- src/lib/a2a/__tests__/task-store.test.ts` - passed, 5 tests.
- `npm --prefix apps/kitchen run test -- src/lib/a2a/__tests__/task-service.test.ts` - passed, 6 tests.
- `npm --prefix apps/kitchen run test -- src/app/a2a/__tests__/route.test.ts` - passed, 10 tests.
- `npm --prefix apps/kitchen run test -- src/lib/__tests__/db.test.ts` - passed, 6 tests.
- `npm --prefix apps/kitchen run lint` - passed with 12 pre-existing warnings.
- `npm --prefix apps/kitchen run build` - passed with known pre-existing Turbopack NFT warning.
- `npm --prefix apps/kitchen run test -- --run` - passed post-wave, 59 files and 403 tests.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

Kitchen now has the durable A2A task transport layer needed for Wave 3: outbound A2A client/delegation, ADK proof fixture, and UI/Flow surfacing can build on registered A2A agents plus persisted task lifecycle state.

---
*Phase: 35-a2a-protocol-implementation-google-adk-support*
*Completed: 2026-05-05*
