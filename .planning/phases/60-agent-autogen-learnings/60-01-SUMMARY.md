---
phase: 60
plan: 01
title: Agent Autogen Learnings
status: partial
completed: 2026-05-16
requirements: [AGENTGEN-01, AGENTGEN-02, AGENTGEN-03, AGENTGEN-04, AGENTGEN-05, AGENTGEN-06]
---

# Phase 60 Plan 01 — Agent Autogen Learnings: Summary

> Reconstructed during the 2026-05-16 reconciliation (see 57-01-SUMMARY.md note).
> This is the **least complete** v2.5 phase.

## Outcome

Proposal types (`agent_instruction_patch`, `skill_addition`,
`tool_routing_update`), trajectory scorer, and weight presets are implemented
and tested. Per-role golden sets exist as **stubs only**. Two success criteria
are NOT met.

## What Was Done

- Registry entries for the 3 agent proposal types; `lib/evals/trajectory-scorer.ts`;
  weight presets in `memroos.eval.yaml` and `presets.ts`.
- Per-role golden-set files (`sales/support/finance/ops`) scaffolded.
- Reconciliation fix: sidebar nav had duplicate labels — `/agent-autogen` and
  `/memory-autogen` both rendered as "Agents"/"Memory", colliding with existing
  nav. Relabeled to "Agent Autogen" / "Memory Autogen".

## Gaps / Deferred

- **Golden sets populated to minimal viable (2026-05-16):** sales/support/
  finance/ops each 15 rows (11 positive + 4 policy-leak negative). Verified
  against the real judge: drift agreement ≥0.85 with both classes exercised
  (criterion 2 met at minimal-viable bar; full ~50-row sets still a follow-up).
  Reproducible via `golden-sets/.generate.mjs`.
- **Dogfood W-lift still NOT capturable (architectural).** Same root cause as
  phase 58: `EvalService.runForTrace` clones the baseline instead of re-scoring
  the post-apply artifact, so agent-autogen proposals can never show real W
  lift in production. Success criterion 5 remains unmet until `runForTrace`
  re-evaluates via `scoreTraceWithEvalEngine`. See 58-01-SUMMARY.md.
- Phase 60 now ~70% (golden sets done); remaining gap is the runForTrace
  re-scoring architecture, shared with phase 58.
