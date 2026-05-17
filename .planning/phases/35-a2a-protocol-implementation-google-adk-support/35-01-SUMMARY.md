---
phase: 35-a2a-protocol-implementation-google-adk-support
plan: 01
subsystem: api
tags: [a2a, agent-card, config, nextjs, security]

requires:
  - phase: 34-universal-rest-api-canonical-agent-registry
    provides: canonical registry identity and bearer/API-key security model
provides:
  - Config-derived A2A operating profile and public endpoint seams
  - Spec-shaped A2A task, message, event, skill, security, and agent-card types
  - Memroos's public A2A agent card at the canonical and compatibility well-known paths
  - A2A error helper for later authenticated task routes
affects: [phase-35, phase-36, a2a-registration, a2a-task-api, adk-proof]

tech-stack:
  added: []
  patterns:
    - Config-derived public A2A URLs with trailing-slash normalization
    - Public card builder allowlisting safe A2A fields only
    - Well-known App Router route handlers using dynamic force-dynamic

key-files:
  created:
    - apps/memroos/src/lib/a2a/config.ts
    - apps/memroos/src/lib/a2a/types.ts
    - apps/memroos/src/lib/a2a/errors.ts
    - apps/memroos/src/lib/a2a/agent-card.ts
    - apps/memroos/src/app/.well-known/agent-card.json/route.ts
    - apps/memroos/src/app/.well-known/agent.json/route.ts
  modified:
    - .env.example
    - apps/memroos/src/lib/a2a/__tests__/agent-card.test.ts

key-decisions:
  - "Use `/.well-known/agent-card.json` as canonical and `/.well-known/agent.json` as compatibility-only."
  - "Advertise HTTP bearer auth through `bearerAuth` without exposing credential words or private config values in the public card JSON."
  - "Keep Phase 35 profile and endpoint assumptions env-derived so private-network, cloud HTTPS, and custom deployments do not require source edits."

patterns-established:
  - "A2A foundation modules live under `apps/memroos/src/lib/a2a` and isolate protocol/config/card concerns from existing dispatch cards."
  - "Compatibility well-known routes wrap the canonical card and mark `extensions.memroos.compatibilityAlias` instead of becoming a second source of truth."

requirements-completed: [A2A-01, A2A-08]

duration: 3 min
completed: 2026-05-05
---

# Phase 35 Plan 01: A2A Foundation, Config, And Memroos Agent Card Summary

**Config-derived A2A profile support with Memroos's secure public agent card at canonical and compatibility well-known paths**

## Performance

- **Duration:** 3 min
- **Started:** 2026-05-05T08:54:26Z
- **Completed:** 2026-05-05T08:57:40Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Added failing contract tests first for A2A config defaults, env overrides, public card security, skills, and well-known route behavior.
- Added `getA2aConfig()` with operating-profile vocabulary, URL normalization, private-network-card policy, and ADK fixture URL seams.
- Added spec-shaped A2A types and error helpers for later task lifecycle and registration plans.
- Added Memroos's own A2A agent card with streaming/history capabilities, safe skills, bearer auth declaration, and no leaked secrets or local paths.
- Added canonical `/.well-known/agent-card.json` route plus compatibility `/.well-known/agent.json` route.

## Task Commits

Each task was committed atomically:

1. **Task A: Add A2A config and agent-card contract tests first** - `cf00d68` (test)
2. **Task B: Implement config, types, and error helpers** - `809dd72` (feat)
3. **Task C: Build Memroos's A2A agent card and well-known routes** - `809dd72` (feat)

**Plan metadata:** this summary commit

## Files Created/Modified

- `apps/memroos/src/lib/a2a/config.ts` - A2A operating profile config, env overrides, URL normalization, and ADK fixture default.
- `apps/memroos/src/lib/a2a/types.ts` - A2A 1.0 constants plus task, message, event, skill, security, and agent-card interfaces.
- `apps/memroos/src/lib/a2a/errors.ts` - A2A error class and HTTP response mapper.
- `apps/memroos/src/lib/a2a/agent-card.ts` - Memroos public A2A card builder with bearer auth and safe public metadata.
- `apps/memroos/src/lib/a2a/__tests__/agent-card.test.ts` - Contract tests for config, card, security leak prevention, and well-known routes.
- `apps/memroos/src/app/.well-known/agent-card.json/route.ts` - Canonical public Memroos A2A agent-card route.
- `apps/memroos/src/app/.well-known/agent.json/route.ts` - Compatibility alias route that marks `compatibilityAlias: true`.
- `.env.example` - Phase 35 A2A profile, URL, timeout, private-network, and ADK fixture env seams.

## Decisions Made

- `/.well-known/agent-card.json` is the canonical route because current A2A discovery uses that path; `/.well-known/agent.json` remains as a compatibility alias for stale roadmap wording and older consumers.
- The card advertises `bearerAuth` HTTP bearer semantics but avoids including credential-sensitive terms such as `token`, `secret`, or private path values in the serialized public JSON.
- A2A operating profile and endpoint URLs are config-derived from the start so multi-machine startup deployments can use private-network, HTTPS, or custom topologies without changing source.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Removed credential-sensitive wording from public card JSON**
- **Found during:** Task C (Memroos agent card implementation)
- **Issue:** The initial `bearerAuth` description included the word `token`, causing the public-card no-secret contract to fail.
- **Fix:** Reworded `bearerFormat` and `description` to use non-sensitive credential language while preserving HTTP bearer semantics.
- **Files modified:** `apps/memroos/src/lib/a2a/agent-card.ts`
- **Verification:** `npm --prefix apps/memroos run test -- src/lib/a2a/__tests__/agent-card.test.ts`
- **Committed in:** `809dd72`

---

**Total deviations:** 1 auto-fixed (1 missing critical).
**Impact on plan:** The fix tightened the intended security contract without changing scope.

## Issues Encountered

- `npm --prefix apps/memroos run typecheck` is listed in the plan but no `typecheck` script exists in `apps/memroos/package.json`. Used `npm --prefix apps/memroos run build` as the TypeScript verification equivalent; it completed successfully.
- Build emitted the known pre-existing Turbopack NFT warning through `/api/apo`, already documented outside this plan.
- Existing Vitest warning remains in `apps/memroos/src/app/api/agents/__tests__/card.test.ts` for nested `vi.mock`; tests still pass and this warning predates Phase 35 execution.

## Verification

- `npm --prefix apps/memroos run test -- src/lib/a2a/__tests__/agent-card.test.ts` - passed, 7 tests.
- `npm --prefix apps/memroos run test -- src/lib/a2a/__tests__/agent-card.test.ts src/app/api/agents/__tests__/card.test.ts` - passed, 11 tests.
- `npm --prefix apps/memroos run lint` - passed with 12 pre-existing warnings.
- `npm --prefix apps/memroos run build` - passed with known pre-existing Turbopack NFT warning.
- Acceptance checks for files, env section, task states, skill IDs, and absence of placeholder user paths in new A2A source/route files all passed.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

Wave 1 is ready for Wave 2. Plan 35-02 can build A2A agent-card ingestion on the new config/types, and Plan 35-03 can build task lifecycle routes on the shared task/message/error types.

---
*Phase: 35-a2a-protocol-implementation-google-adk-support*
*Completed: 2026-05-05*
