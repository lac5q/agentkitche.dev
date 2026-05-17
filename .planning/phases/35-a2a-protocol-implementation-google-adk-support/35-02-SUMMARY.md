---
phase: 35-a2a-protocol-implementation-google-adk-support
plan: 02
subsystem: api
tags: [a2a, agent-card, registry, ssrf, adk]

requires:
  - phase: 35-01-a2a-foundation
    provides: A2A config, types, errors, and Memroos agent-card foundation
provides:
  - A2A agent-card validation and safe fetch policy
  - Deterministic A2A registry IDs derived from card URL hashes
  - Canonical registry ingestion for remote A2A and Google ADK agents
  - Auth-gated A2A registration adapter route
affects: [phase-35, phase-36, a2a-task-api, adk-proof, registry-ui]

tech-stack:
  added: []
  patterns:
    - SSRF-aware remote card fetching with timeout and response-size limits
    - A2A card ingestion as an adapter around `registerAgent()`
    - Allowlisted `metadata.a2a` registry payloads for protocol/debug context

key-files:
  created:
    - apps/memroos/src/lib/a2a/card-ingestion.ts
    - apps/memroos/src/lib/a2a/__tests__/card-ingestion.test.ts
    - apps/memroos/src/app/api/a2a/agents/register/route.ts
    - apps/memroos/src/app/api/a2a/agents/__tests__/register-route.test.ts
  modified: []

key-decisions:
  - "A2A remote discovery writes through the Phase 34 canonical registry instead of creating an A2A-specific registry table."
  - "Unsafe agent-card URLs are rejected before fetch, including non-HTTP schemes, credentialed URLs, and cloud metadata endpoints."
  - "ADK-shaped registrations map to `platform: gemini` while generic A2A-compatible cards use `openclaw` until a broader platform enum exists."

patterns-established:
  - "Remote cards are normalized into registry capabilities with `a2a` tags and optional `adk` tags."
  - "A2A registration route reuses the operator write authorization gate before calling the ingestion service."

requirements-completed: [A2A-03, A2A-04, A2A-06]

duration: 4 min
completed: 2026-05-05
---

# Phase 35 Plan 02: A2A Agent-Card Ingestion And Canonical Registration Summary

**SSRF-aware A2A agent-card ingestion that registers ADK and generic A2A agents through Memroos's canonical roster**

## Performance

- **Duration:** 4 min
- **Started:** 2026-05-05T08:58:55Z
- **Completed:** 2026-05-05T09:03:05Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments

- Added card-ingestion contract tests covering ADK-shaped validation, unsafe URL rejection, deterministic IDs, metadata allowlisting, and canonical registry writes.
- Implemented `validateA2aAgentCard`, `isAllowedAgentCardUrl`, `fetchA2aAgentCard`, and `ingestA2aAgentCard`.
- Added fetch safety controls: `AbortSignal.timeout`, response-size checks, unsafe scheme rejection, credentialed URL rejection, and metadata host rejection.
- Normalized A2A card skills into canonical registry capabilities and stored safe protocol metadata under `agent.metadata.a2a`.
- Added `POST /api/a2a/agents/register`, gated by the same operator registry-write authorization used by Phase 34, returning registered canonical agents and optional one-time keys.

## Task Commits

Each task was committed atomically:

1. **Task A: Add failing A2A card ingestion tests** - `2af2c49` (test)
2. **Task B: Implement card validation, safe fetch policy, and canonical registry write** - `9219c24` (feat)
3. **Task C: Add authenticated A2A registration adapter route** - `4b3a2069`, `985ebd3f` (test, feat)
4. **Build type fix** - `9929a053` (fix)

**Plan metadata:** this summary commit

## Files Created/Modified

- `apps/memroos/src/lib/a2a/card-ingestion.ts` - Remote A2A card validation, fetch policy, ADK detection, capability normalization, metadata allowlisting, and canonical registry registration.
- `apps/memroos/src/lib/a2a/__tests__/card-ingestion.test.ts` - Service tests for validation, unsafe URL rejection, canonical registry writes, metadata keys, and deterministic IDs.
- `apps/memroos/src/app/api/a2a/agents/register/route.ts` - Operator-auth-gated A2A registration adapter route.
- `apps/memroos/src/app/api/a2a/agents/__tests__/register-route.test.ts` - Route tests proving missing body handling, unsafe URL safety, ADK registration, and canonical registry visibility.

## Decisions Made

- Kept A2A registration as a thin adapter around `registerAgent()` so Phase 34 remains the single registry source of truth.
- Used deterministic IDs of `a2a_${sha256(cardUrl).slice(0, 12)}` when a remote card does not expose a stable Memroos ID.
- Stored only allowlisted card metadata under `metadata.a2a`: card URL, endpoint URL, version, security schemes, input/output modes, validation status, card hash, fetch time, and source.
- Reused the Phase 34 operator authorization gate on the registration route to avoid adding another unauthenticated key-minting surface.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed build-time securitySchemes type narrowing**
- **Found during:** Task C plan-level build verification
- **Issue:** `validateA2aAgentCard()` narrowed `securitySchemes` to `Record<string, unknown>`, which passed runtime tests but failed Next.js TypeScript build.
- **Fix:** Cast the guarded record to `A2aAgentCard["securitySchemes"]` after `isRecord()` validation.
- **Files modified:** `apps/memroos/src/lib/a2a/card-ingestion.ts`
- **Verification:** `npm --prefix apps/memroos run test -- src/lib/a2a/__tests__/card-ingestion.test.ts src/app/api/a2a/agents/__tests__/register-route.test.ts` and `npm --prefix apps/memroos run build`
- **Committed in:** `9929a053`

---

**Total deviations:** 1 auto-fixed (1 blocking).
**Impact on plan:** The fix was required for type safety and did not change behavior or scope.

## Issues Encountered

- `npm --prefix apps/memroos run typecheck` is listed in the plan but the app has no `typecheck` script. Used `npm --prefix apps/memroos run build` for TypeScript verification.
- Build still emits the known pre-existing Turbopack NFT warning through `/api/apo`; build exits successfully after the warning.
- Lint still reports 12 pre-existing warnings unrelated to this plan.

## Verification

- `npm --prefix apps/memroos run test -- src/lib/a2a/__tests__/card-ingestion.test.ts src/lib/__tests__/agent-registry.test.ts` - passed, 12 tests.
- `npm --prefix apps/memroos run test -- src/app/api/a2a/agents/__tests__/register-route.test.ts src/app/api/agents/__tests__/registry-route.test.ts` - passed, 6 tests.
- `npm --prefix apps/memroos run test -- src/lib/a2a/__tests__/card-ingestion.test.ts src/app/api/a2a/agents/__tests__/register-route.test.ts src/app/api/agents/__tests__/registry-route.test.ts` - passed, 12 tests.
- `npm --prefix apps/memroos run lint` - passed with 12 pre-existing warnings.
- `npm --prefix apps/memroos run build` - passed with known pre-existing Turbopack NFT warning.

## User Setup Required

None - no external service configuration required for this plan.

## Next Phase Readiness

A2A/ADK agent discovery now lands in the canonical registry, so durable task lifecycle work can authenticate registered agents and later UI work can surface A2A/ADK agents from the existing roster.

---
*Phase: 35-a2a-protocol-implementation-google-adk-support*
*Completed: 2026-05-05*
