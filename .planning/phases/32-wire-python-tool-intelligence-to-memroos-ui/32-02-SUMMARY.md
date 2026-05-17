# Phase 32 Plan 02 Summary: Types + Algorithm Port (Wave 1)

## Status

Complete.

## What Shipped

- Added 4 new types to `apps/memroos/src/types/index.ts`:
  - `ToolAttentionContextPack` (task_type, repo, agent_id, tags)
  - `ToolAttentionOutcomeSummary` (uses, successes, failures, score, lastOutcome, lastUsedAt)
  - `SimilarTaskRecommendation` (capabilityId, name, description, type, contextScore, overallScore, reason)
  - `SimilarTaskResponse` (context, recommendations, timestamp)
- Added `outcomeSummary?: ToolAttentionOutcomeSummary` to `ToolAttentionCapability`
- Implemented in `apps/memroos/src/lib/tool-attention.ts`:
  - `SUCCESS_OUTCOMES` / `FAILURE_OUTCOMES` constant sets (matching Python)
  - `contextMatchSignal(outcome, context)` — exact multipliers: task_type*2, repo*2, agent_id*1, tags*1
  - `buildOutcomeSummaries(outcomes)` — aggregate outcomes by toolId
  - `getSimilarTaskRecommendations(context, limit)` — overall score = outcomeScore + contextScore*3
- Privacy: `contextMatchSignal` reads only `outcome.metadata.*`, never `outcome.task`
- 4 contextMatchSignal tests implemented and passing

## Verification

`npm --prefix apps/memroos run test`

Result: 336 passed | 6 todo (no failures)

## Next

Phase 32 Plan 03: API route + hook.
