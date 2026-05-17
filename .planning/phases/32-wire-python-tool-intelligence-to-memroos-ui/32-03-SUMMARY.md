# Phase 32 Plan 03 Summary: API Route + Hook (Wave 2)

## Status

Complete.

## What Shipped

- Created `apps/memroos/src/app/api/tool-attention/similar/route.ts`
  - `GET /api/tool-attention/similar?task_type=&repo=&agent_id=&tags=&limit=`
  - Builds `ToolAttentionContextPack` from query params
  - Calls `getSimilarTaskRecommendations(context, limit)`
  - `force-dynamic` so it never serves stale cached results
- Implemented 3 route tests in `similar/__tests__/route.test.ts` (all passing)
- Added `useSimilarTaskRecommendations(context)` hook to `api-client.ts`
  - Imports `SimilarTaskResponse`, `ToolAttentionContextPack` from `@/types`
  - refetchInterval: 60000ms
  - queryKey: `["tool-attention-similar", context]`

## Verification

`npm --prefix apps/memroos run test`

Result: 339 passed | 3 todo (no failures)

## Next

Phase 32 Plan 04: UI badges + SimilarTaskPanel component + Cookbooks page wiring.
