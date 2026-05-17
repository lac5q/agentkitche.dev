---
phase: 35-a2a-protocol-implementation-google-adk-support
plan: 04
subsystem: delegation-ui
tags: [a2a, delegation, google-adk, registry-ui, flow]

requires:
  - phase: 35-02-a2a-card-ingestion
    provides: A2A card ingestion into the canonical registry
  - phase: 35-03-a2a-task-api
    provides: durable A2A task state and task lifecycle routes
provides:
  - Outbound A2A client and dispatch adapter
  - Optional Google ADK A2A fixture/sample
  - A2A/ADK registration and safe metadata surfacing in Registry UI
  - A2A/ADK indicators and detail metadata in Flow
  - End-to-end proof that registered A2A agents can be delegated to and shown dynamically
affects: [phase-35, phase-36, a2a-delegation, flow-roster, registry-ui]

tech-stack:
  added: []
  patterns:
    - Thin A2A broker delegation through registry metadata
    - Env-key-only outbound auth with no UI secret rendering
    - Optional ADK fixture outside app startup path
    - Canonical roster metadata drives Registry and Flow display

key-files:
  created:
    - apps/memroos/src/lib/a2a/client.ts
    - apps/memroos/src/lib/a2a/__tests__/client.test.ts
    - apps/memroos/src/lib/dispatch/a2a-adapter.ts
    - apps/memroos/src/lib/dispatch/__tests__/a2a-adapter.test.ts
    - examples/adk-a2a-agent/README.md
    - examples/adk-a2a-agent/agent.py
    - examples/adk-a2a-agent/agent-card.json
  modified:
    - apps/memroos/src/lib/dispatch/adapter-factory.ts
    - apps/memroos/src/lib/dispatch/types.ts
    - apps/memroos/src/lib/agent-registry.ts
    - apps/memroos/src/types/index.ts
    - apps/memroos/src/lib/api-client.ts
    - apps/memroos/src/app/agents/page.tsx
    - apps/memroos/src/components/agents/agent-registration-form.tsx
    - apps/memroos/src/components/agents/agent-registry-table.tsx
    - apps/memroos/src/components/agents/agent-registry-drawer.tsx
    - apps/memroos/src/components/agents/__tests__/agent-registry-page.test.tsx
    - apps/memroos/src/app/flow/page.tsx
    - apps/memroos/src/components/flow/react-flow-canvas.tsx
    - apps/memroos/src/components/flow/node-detail-panel.tsx
    - apps/memroos/src/components/flow/__tests__/registry-flow-roster.test.tsx
    - .planning/REQUIREMENTS.md

key-decisions:
  - "A2A delegation is selected by canonical `protocol: a2a`, not by platform alone, so legacy Gemini agents still use the existing hive-poll path."
  - "Outbound remote bearer credentials are read only through configured environment variable names in metadata and are never rendered in Registry or Flow."
  - "The Google ADK proof is optional example infrastructure under `examples/`, not a Memroos startup dependency."
  - "Registry and Flow show A2A/ADK status from canonical registry metadata, with credentialed URLs redacted before display."

requirements-completed: [A2A-04, A2A-05, A2A-06]

duration: 11 min
completed: 2026-05-05
---

# Phase 35 Plan 04: A2A Delegation, ADK Proof, And Registry/Flow Surfacing Summary

**Memroos can now delegate to registered A2A agents, prove the Google ADK path with an optional fixture, and surface A2A/ADK agents safely from the canonical roster.**

## Performance

- **Duration:** 11 min
- **Started:** 2026-05-05T09:16:30Z
- **Completed:** 2026-05-05T09:27:41Z
- **Tasks:** 5
- **Files modified:** 21

## Accomplishments

- Added failing-first outbound A2A client and adapter tests covering endpoint resolution, trace ID preservation, env-key auth, timeout wiring, non-2xx truncation, adapter selection, and remote completion mirroring.
- Implemented `sendMessageToA2aAgent()`, `getRemoteA2aTask()`, `cancelRemoteA2aTask()`, and `redactUrlForDisplay()`.
- Added `a2aAdapter` and updated adapter selection so `protocol: "a2a"` wins before platform fallback while non-A2A Gemini agents continue using hive-poll.
- Extended remote agent config and registry conversion so A2A agents with endpoint metadata can participate in outbound dispatch.
- Added an optional ADK-shaped fixture with static `agent-card.json`, minimal `agent.py`, and README commands for `pip install google-adk[a2a]` and `adk api_server --a2a --port 8001`.
- Added Registry UI support for A2A card URL registration through `/api/a2a/agents/register`.
- Added Registry table/drawer A2A and ADK badges plus safe endpoint, version, security, modes, validation, streaming, and source metadata.
- Added Flow A2A/ADK indicators and node-detail metadata driven by canonical registered agents, not hardcoded sample names.
- Marked A2A-05 complete after outbound delegation tests and implementation passed.

## Task Commits

Each task was committed atomically:

1. **Task A: Add outbound A2A client and adapter tests first** - `4e13f4db` (test)
2. **Task B: Implement A2A outbound client and dispatch adapter** - `6a586b17` (feat)
3. **Task C: Add optional Google ADK fixture/sample** - `91fcdda6` (docs)
4. **Task D: Surface A2A/ADK registration and metadata in Registry UI** - `56f239fe` (feat)
5. **Task E: Surface A2A/ADK agents and task summaries in Flow** - `193466cc` (feat)
6. **Build type fix** - `2c969252` (fix)

**Plan metadata:** this summary commit

## Files Created/Modified

- `apps/memroos/src/lib/a2a/client.ts` - Outbound A2A HTTP client, task lookup/cancel helpers, timeout handling, response truncation, and URL redaction.
- `apps/memroos/src/lib/a2a/__tests__/client.test.ts` - Client contract tests for endpoint URL, auth env key, timeout, response truncation, and trace IDs.
- `apps/memroos/src/lib/dispatch/a2a-adapter.ts` - Dispatch adapter that sends A2A tasks and mirrors recognized remote task state into Memroos task storage when present.
- `apps/memroos/src/lib/dispatch/__tests__/a2a-adapter.test.ts` - Adapter selection and remote completion mirroring tests.
- `apps/memroos/src/lib/dispatch/adapter-factory.ts` - Selects A2A adapter when `agent.protocol === "a2a"`.
- `apps/memroos/src/lib/dispatch/types.ts` - Allows adapters to receive the selected remote agent config.
- `apps/memroos/src/lib/agent-registry.ts` - Carries protocol/metadata into remote configs and normalizes optional location for build safety.
- `apps/memroos/src/types/index.ts` - Extends `RemoteAgentConfig` with optional protocol and metadata.
- `examples/adk-a2a-agent/*` - Optional ADK fixture and instructions.
- `apps/memroos/src/lib/api-client.ts` - Adds `registerA2aAgentCard()` and mutation hook.
- `apps/memroos/src/components/agents/*` - Adds A2A registration mode and safe A2A/ADK metadata display.
- `apps/memroos/src/app/flow/page.tsx` and `apps/memroos/src/components/flow/*` - Carries registry metadata into Flow and node details.
- `.planning/REQUIREMENTS.md` - Marks A2A-05 complete.

## Decisions Made

- A2A adapter routing is protocol-driven. Platform labels such as `gemini` are not enough to switch transport because existing non-A2A Gemini agents rely on the hive-poll adapter.
- Outbound credentials are intentionally indirect: registry metadata may name an environment variable, but Memroos never stores or renders the secret value in UI.
- The ADK proof remains optional and operator-run. It demonstrates the install/run/card-registration path without adding ADK as a Memroos runtime dependency.
- UI surfaces endpoint hosts and redacted card URLs, not raw credential-bearing URLs or auth header details.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used package-relative Vitest paths with `npm --prefix`**
- **Found during:** Task A red-test verification
- **Issue:** The plan's repo-root test paths produce `No test files found` when passed through `npm --prefix apps/memroos` because Vitest runs from the package directory.
- **Fix:** Used equivalent package-relative paths such as `src/lib/a2a/__tests__/client.test.ts`.
- **Verification:** Tests failed for the intended missing modules first, then passed after implementation.

**2. [Rule 3 - Blocking] Normalized remote agent location for TypeScript build**
- **Found during:** Plan-level build verification
- **Issue:** `RegisteredAgent` inherits optional `location` from the base agent type, while `RemoteAgentConfig.location` is strict.
- **Fix:** Defaulted remote config location to `local` when the DB-backed registry object does not carry a narrowed value.
- **Files modified:** `apps/memroos/src/lib/agent-registry.ts`
- **Verification:** `npm --prefix apps/memroos run build` passed after the fix.
- **Committed in:** `2c969252`

---

**Total deviations:** 2 auto-fixed (2 blocking).
**Impact on plan:** No public API contract change. Both fixes preserved the planned behavior.

## Issues Encountered

- GitNexus marked the Registry UI patch as high impact because `api-client.ts` is a shared module. The actual diff was additive: new A2A registration function/hook only; existing fetch/query functions were not behaviorally changed. Full tests, lint, and build passed.
- `npm --prefix apps/memroos run typecheck` is listed in the plan, but the app has no `typecheck` script. Used `npm --prefix apps/memroos run build` for TypeScript verification.
- Build still emits the known pre-existing Turbopack NFT warning through `/api/apo`; build exits successfully.
- Lint still reports 12 pre-existing warnings unrelated to this plan.
- Full tests still emit the existing Vitest hoisting warning in `src/app/api/agents/__tests__/card.test.ts`.

## Verification

- `npm --prefix apps/memroos run test -- src/lib/a2a/__tests__/client.test.ts src/lib/dispatch/__tests__/a2a-adapter.test.ts src/lib/dispatch/__tests__/adapter-factory.test.ts` - passed, 15 tests.
- `npm --prefix apps/memroos run test -- src/lib/__tests__/agent-registry.test.ts src/lib/a2a/__tests__/card-ingestion.test.ts src/lib/a2a/__tests__/client.test.ts src/lib/dispatch/__tests__/a2a-adapter.test.ts src/lib/dispatch/__tests__/adapter-factory.test.ts` - passed, 27 tests.
- `test -f examples/adk-a2a-agent/README.md && test -f examples/adk-a2a-agent/agent-card.json && rg "adk api_server --a2a --port 8001" examples/adk-a2a-agent/README.md` - passed.
- `npm --prefix apps/memroos run test -- src/components/agents/__tests__/agent-registry-page.test.tsx` - passed, 4 tests.
- `npm --prefix apps/memroos run test -- src/components/flow/__tests__/registry-flow-roster.test.tsx` - passed, 4 tests.
- `npm --prefix apps/memroos run test -- src/components/agents/__tests__/agent-registry-page.test.tsx src/components/flow/__tests__/registry-flow-roster.test.tsx` - passed, 8 tests.
- `npm --prefix apps/memroos run test -- src/lib/__tests__/agent-registry.test.ts src/lib/a2a/__tests__/client.test.ts src/lib/dispatch/__tests__/a2a-adapter.test.ts src/components/agents/__tests__/agent-registry-page.test.tsx src/components/flow/__tests__/registry-flow-roster.test.tsx` - passed, 21 tests.
- `npm --prefix apps/memroos run test -- --run` - passed, 61 files and 414 tests.
- `npm --prefix apps/memroos run lint` - passed with 12 pre-existing warnings.
- `npm --prefix apps/memroos run build` - passed with known pre-existing Turbopack NFT warnings.

## User Setup Required

Optional only:

- To run the ADK proof fixture, install ADK with `pip install google-adk[a2a]`.
- Start the fixture with `adk api_server --a2a --port 8001 examples/adk-a2a-agent`.
- Register the fixture card through Memroos's protected `/api/a2a/agents/register` endpoint using the README curl example.

## Next Phase Readiness

Phase 35 is implementation-complete. Memroos now has the A2A transport layer, canonical A2A registration, durable task lifecycle, outbound delegation, ADK proof fixture, and Registry/Flow surfacing needed for Phase 36 LangGraph orchestration to sit on top of A2A without owning transport concerns.

---
*Phase: 35-a2a-protocol-implementation-google-adk-support*
*Completed: 2026-05-05*
