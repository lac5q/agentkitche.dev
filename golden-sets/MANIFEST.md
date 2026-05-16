# Golden Sets Manifest

## Overview

This directory contains per-role golden evaluation sets for the MemroOS autogen loop.
Each set provides labelled examples for the drift guard and trajectory scorer.

---

## Files

| File | Role | Examples | Format | Status |
|---|---|---|---|---|
| `sales-role.json` | sales | 2 | JSON array | Phase 60 seed |
| `support-role.json` | support | 2 | JSON array | Phase 60 seed |
| `finance-role.json` | finance | 2 | JSON array | Phase 60 seed |
| `ops-role.json` | ops | 2 | JSON array | Phase 60 seed |
| `sales-50.jsonl` | sales | 2 | JSONL | Phase 57 stub |
| `support-50.jsonl` | support | 2 | JSONL | Phase 57 stub |
| `finance-50.jsonl` | finance | 2 | JSONL | Phase 57 stub |
| `ops-50.jsonl` | ops | 2 | JSONL | Phase 57 stub |
| `business-ops-50.jsonl` | ops (default) | varies | JSONL | Phase 57 |

---

## Purpose

Each role golden set is used by the eval engine to:

1. **Drift guard** — compare judge scores against human scores; a passing agreement >= 0.85 is required before an eval run is trusted.
2. **Trajectory scorer** — examples with `trace.steps` arrays exercise the `trajectory_multi_step` L2 scorer; examples without `steps` exercise the single-turn fallback path.
3. **Autogen loop** — low-W runs on these examples trigger SEAL proposal generation for the agent instruction patch, skill addition, and tool routing update proposal types.

---

## Example Format

### Single-turn example (no `steps`)

```json
{
  "id": "role-001",
  "role": "sales",
  "input": "...",
  "expectedOutput": "...",
  "humanScore": 1,
  "agentId": "sales-agent",
  "tags": ["single-turn"],
  "trace": {
    "traceId": "...",
    "agentId": "...",
    "agentModelFamily": "openai",
    "role": "sales",
    "input": "...",
    "output": "...",
    "expectedFacts": [...],
    "toolCalls": [...],
    "outcome": { "completed": true, ... }
  }
}
```

### Trajectory example (with `steps`)

Same as above but the `trace` object extends `TrajectoryTrace`:

```json
{
  "trace": {
    ...
    "steps": [
      { "stepIndex": 0, "input": "...", "output": "...", "toolCalls": [...], "outcome": {...} },
      ...
    ],
    "finalOutput": "..."
  }
}
```

---

## Validation Protocol

Drift guard agreement is computed by running each example through the eval judge and comparing the judge score (>= 0.5 = pass) against `humanScore` (>= 0.5 = pass). The agreement ratio must meet or exceed the `drift_guard.golden_agreement_floor` in `memroos.eval.yaml` (default: **0.85**).

```bash
# To run the drift guard validation manually:
cd apps/kitchen && npx vitest run src/lib/evals/__tests__/
```

---

## Validation Status

| File | Authorship | Validation Date | Agreement | Notes |
|---|---|---|---|---|
| `sales-role.json` | Phase 60 / 2026-05-15 | pending | pending | 2 seed examples; full 50 is a future task |
| `support-role.json` | Phase 60 / 2026-05-15 | pending | pending | 2 seed examples |
| `finance-role.json` | Phase 60 / 2026-05-15 | pending | pending | 2 seed examples |
| `ops-role.json` | Phase 60 / 2026-05-15 | pending | pending | 2 seed examples |

The 0.85 drift-guard floor is enforced at eval time.  Validation dates and agreement
scores will be filled in after running the drift guard on the full expanded sets.

---

## Expansion Plan

Phase 60 ships 2-example seeds per role (1 single-turn + 1 trajectory each).
The full ~50-example expansion per role is planned as a Phase 60 follow-on task
using a trace-capture annotation workflow (see Phase 60 CONTEXT open question 1).
