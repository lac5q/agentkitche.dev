# Phase 51 Summary: Agent Memory Client v2

Completed 2026-05-11.

## Product Goal

Let agent sessions retrieve compact relevant memory instead of dumping broad file-based memory into every run.

## Shipped

- Added `apps/memroos/src/lib/agent-runtime/memory-client.ts`.
- Added relevance-scored local memory search with synonym expansion.
- Added context injection capped to 1,500 characters.
- Added duplicate memory merging with `mergeCount`.
- Added TTL expiration with archive-before-delete behavior.
- Added backward-compatible `memoryTool` API for add, replace, and remove.

## Verification

- `npm --prefix apps/memroos run test -- src/lib/agent-runtime/__tests__/memory-client.test.ts` passed.
- Full `npm test -- --run` passed.

## Risk Notes

This is local agent-runtime storage and does not write to external services.
