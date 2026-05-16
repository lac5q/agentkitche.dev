---
phase: 59
plan: 01
title: Memory Autogen Learnings
status: partial
completed: 2026-05-16
requirements: [MEMGEN-01, MEMGEN-02, MEMGEN-03, MEMGEN-04, MEMGEN-05, MEMGEN-06]
---

# Phase 59 Plan 01 — Memory Autogen Learnings: Summary

> Reconstructed during the 2026-05-16 reconciliation. Phase 59 was implemented
> with **no phase plan/contract** (the v2.5 kickoff intended phase 59 for the
> memory-autogen scope but it was never planned). A retro PLAN.md was authored
> alongside this SUMMARY so the v2.5 record is complete and honest.

## Outcome

All 6 MEMGEN requirements have real implementations (not stubs): the 5 memory
proposal types live in the shared closed proposal registry, and the fixed-harness
memory policy lab ranks variants by composite W. Committed in `7887b18`, tests
green within the full suite.

## What Was Done

- 5 memory proposal types (`memory_rewrite`, `query_hint`, `salience_update`,
  `tier_route`, `eval_case_addition`) in `lib/seal/proposal-registry.ts` — they
  ride the same SEAL approve→apply→keep/rollback machinery as phases 58/60.
- `lib/memory-policy-lab.ts` — Karpathy-style fixed-harness ranker (MEMGEN-06)
  with injectable evaluator for deterministic tests.
- `lib/memory-recall-evals.ts` + `/api/memory/{evals,policy-lab,proposals}` +
  memory-autogen UI + `npm run eval:memory` script.

## Gaps / Deferred

- **No original phase contract** — this is retro-documented. Success criteria
  were never defined up front; "covered" here means "implemented + tested",
  not "validated against an agreed bar".
- **Shares the dogfood W-lift architectural blocker** with phases 58/60:
  `EvalService.runForTrace` clones the baseline instead of re-scoring the
  post-apply artifact, so memory proposals cannot demonstrate real W lift in
  production until that is fixed. See `58-01-SUMMARY.md`.
- Recall evals depend on live memory backends (mem0/graph) for non-fixture runs;
  only fixture/deterministic paths are exercised in the test suite.
- Scope-classification open: fold phase 59 into v2.5 formally, or migrate to v3.
  Tracked in STATE.md.
