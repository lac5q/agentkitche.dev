---
phase: 58
plan: 02
title: Close the dogfood W-lift gap
status: complete-tier1
completed: 2026-05-16
requirements: [SEAL-01, SEAL-03, SEAL-04, SEAL-06]
---

# Phase 58 Plan 02 — Close the dogfood W-lift gap: Summary

## Outcome

SEAL's post-apply path now produces deterministic, proposal-aware composite-W
movement for memory/config-style proposal classes without relying on a mocked
eval service. `SealService.applyProposal` prefers `EvalService.rescoreForProposal`
when available, and the re-score path runs through the real eval engine,
golden-set loader, layer scorers, judge, drift guard, persistence, and SEAL
audit metadata.

This closes the Tier 1 dogfood gap: keep-on-improvement and rollback-on-regress
are both reachable through the real service path. The W delta is explicitly
modeled from the baseline, proposal type, forecast delta, and stable diff hash;
it is not an empirical agent re-execution.

## What Was Done

- Added `apps/memroos/src/lib/seal/rescore.ts` for deterministic modeled
  post-apply re-scoring.
- Added proposal-aware `EvalService.rescoreForProposal` and wired
  `SealService.applyProposal` to use it before falling back to `runForTrace`.
- Preserved honest handling for `agent_instruction_patch`, `skill_addition`,
  and `noop_test`: W stays unchanged and audit/scorer metadata records
  `wLiftModeled:false`.
- Added node-environment SEAL re-score tests covering deterministic W movement,
  keep-on-improvement, rollback-on-regress, behavioral proposal honesty, and
  shadow mutation rollback.
- Updated Phase 58 and Phase 60 summaries to document the modeled Tier 1
  closure and the v3 carry-forward for true behavioral W-lift.

## Verification

- `cd apps/memroos && npm exec -- vitest run src/lib/seal/__tests__/rescore.test.ts src/lib/seal/__tests__/sdk-eval-service.test.ts src/lib/seal/__tests__/seal-substrate.test.ts`
  - Result: 3 test files passed, 12 tests passed.

## Gaps / Deferred

- Tier 1 W-lift is modeled, deterministic fixed-harness evidence. It must not be
  described as a real task rerun or empirical behavior improvement.
- True behavioral lift for instruction/skill proposals requires agent
  re-execution or a separate behavior-effect model and remains v3 scope.
- Full-suite and production build health still depend on the broader dirty
  v2.5/v3 worktree; this summary records the verified Phase 58 Plan 02 closure
  evidence, not a clean release commit.
