---
phase: 58
plan: 01
title: SEAL Self-Improvement Substrate
status: partial
completed: 2026-05-16
requirements: [SEAL-01, SEAL-02, SEAL-03, SEAL-04, SEAL-05, SEAL-06]
---

# Phase 58 Plan 01 — SEAL Self-Improvement Substrate: Summary

> Reconstructed during the 2026-05-16 reconciliation (see 57-01-SUMMARY.md note).

## Outcome

Full reflection → typed proposal → operator approval → shadow-apply →
keep-if-W-improved → rollback → audit loop is implemented with real logic.
`SealService` (321 lines) plus a closed `proposal-registry`. All 5 SEAL
substrate tests pass after reconciliation.

## What Was Done

- `lib/seal/service.ts`, `proposal-registry.ts`, `apply.ts`, `reflection.ts`,
  `audit.ts`; `seal_proposals`, `seal_proposal_decisions`, `seal_audit_log` tables.
- **Reconciliation fixes:**
  - `seal_audit_log.proposal_id` FK to `seal_proposals` dropped (kept NOT NULL).
    An append-only/immutable audit log must always record even if the proposal
    is absent or later purged — aligns with phase 64 immutable-audit intent.
  - Test mock `getRunById` was discarding the stored row's `trace_id` /
    `composite_w`, defeating the service's (correct) trace-ownership and
    threshold checks; mock now returns the real persisted values.
  - ESM `require("../audit")` replaced with a static namespace import.

## Gaps / Deferred

- Reflection/apply are deliberately thin wrappers over the service — correct by
  design, but end-to-end dogfood evidence (W actually improving) is not captured.
- Closed registry currently exercises `noop_test` proposal type in tests; real
  mutation surfaces validated via phases 59/60 code (separately committed).
- **Dogfood W-lift NOT capturable (architectural, confirmed 2026-05-16).**
  `EvalService.runForTrace` (src/lib/evals/service.ts:111) clones the latest
  baseline run with a new id/timestamps — it does **not** re-score the
  post-apply artifact. Production `SealService` defaults to this `EvalService`,
  so post-apply W always equals baseline W: the keep/rollback machinery works
  but real W improvement can never be observed. SEAL test evidence (keep when
  W improves, rollback when W regresses) only exists because the test injects a
  mock `evalService` returning a distinct post-run. **To meet the W-lift
  criterion, `runForTrace` must actually re-evaluate the mutated artifact via
  `scoreTraceWithEvalEngine`.** Tracked as a v2.5 follow-up in STATE.md.
