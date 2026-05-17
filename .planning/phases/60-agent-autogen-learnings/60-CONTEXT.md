---
phase: 60
name: Agent Autogen Learnings
status: ready-for-planning
gathered: 2026-05-15
---

# Phase 60: Agent Autogen Learnings — Context

## Phase Boundary

### In scope

- Three new proposal types registered against the Phase 58 SEAL substrate:
  - `agent_instruction_patch` — propose edits to a registered agent's system prompt / operating instructions stored in the `agent_instructions` shadow table (new)
  - `skill_addition` — propose registration of a new skill entry in `agent_skill_reports` / the skill catalog; mutation target is a structured JSON record, not a file on disk (v1 scope; see Decision 6)
  - `tool_routing_update` — propose edits to a per-agent tool preference weight stored in the new `agent_tool_routing_policies` table
- Per-role golden sets expanded and human-validated: sales, support, finance, ops, each to ~50 examples in `golden-sets/` (current files are skeleton stubs, 2 lines each — Phase 60 fills them to 50 and validates agreement ≥ 0.85)
- Trajectory eval scorer: multi-step agent run scoring feeding the L2 layer of composite W
- New `TrajectoryTrace` type extending `AgentEvalTrace` with an ordered `steps` array
- Three named weight preset profiles: `outcome-weighted`, `quality-weighted`, `compliance-weighted` — stored in `memroos.eval.yaml` under `weight_presets:` and selectable from the UI and config
- Preset selector UI in the `/evals` config panel (not a new page — extends the existing config surface from Phase 57)
- Dogfood validation: full autogen loop run on at least one role's golden set demonstrating W lift after one approved proposal

### Out of scope

- Phase 61 L3 business adapter connections (CRM, helpdesk, finance) — those signal L3 but are not required for Phase 60's trajectory L2 trajectory scorer
- File-system skill file generation (skill scripts on disk) — v1 `skill_addition` is a structured DB record; file-system skill scaffolding is documented as a v2 concern (see Decision 6)
- Public HTTP surface and SDK packaging — Phase 62
- Per-tenant golden-set isolation — Phase 62 multi-tenant concern
- Auto-apply mode (`seal.auto_apply: true`) — always requires operator approval at v1
- Phase 59 memory proposal types — already in scope for Phase 59; Phase 60 does not modify them

---

## Dependencies

| Dependency | What Phase 60 needs from it |
|---|---|
| Phase 57 (Eval Engine Core) | `EvalService.runForTrace()`, `EvalService.getRunById()`, scorer registry interface, `memroos.eval.yaml` config surface |
| Phase 58 (SEAL Substrate) | `PROPOSAL_TYPES` const in `proposal-registry.ts`, `ProposalRegistryEntry` interface, `SealService`, `seal_proposals` / `seal_proposal_decisions` / `seal_audit_log` tables, `/seal` page, approval queue UI |
| Phase 59 (Memory Autogen) | Proves the substrate is generic over mutation surface before Phase 60 registers agent mutation types; no runtime dependency, but Phase 60 plan assumes Phase 59 shipped without altering the `ProposalRegistryEntry` interface |
| `golden-sets/*.jsonl` (Phase 57 seeds) | 2-line skeleton stubs exist for sales, support, finance, ops — Phase 60 expands to 50 examples each |

Phase 60 does not depend on Phase 59's `eval_case_addition` mechanism to expand the golden sets. The expansion is done by authoring committed `.jsonl` files, not through the SEAL loop. This avoids a circular dependency between golden-set quality and the loop that uses them.

---

## Key Architectural Decisions

### Decision 1 — Mutation surfaces for the three proposal types

**`agent_instruction_patch`**: The `registered_agents` table has no `system_prompt` / `instructions` field. Phase 60 adds a new `agent_instructions` table (`agent_id` FK, `instructions_text`, `version`, `created_at`, `is_active`) to the `initSchema` function. The shadow-copy apply strategy from Phase 58 (transaction-wrapped write, rollback on W_post < W_baseline) works directly: the proposal diff is a text patch against `instructions_text`; apply writes a new `agent_instructions` row in a transaction; if evals pass, the row is committed with `is_active = true` and the previous row flipped to `is_active = false`; on rollback, the transaction is aborted.

**`skill_addition`**: v1 scope is a structured DB record only. Phase 60 adds a `proposed_skills` table (mirroring `agent_skill_reports` shape plus a `proposal_id` FK). Shadow apply inserts into `proposed_skills` within a transaction; the scorer reads from this shadow table to evaluate whether the skill improves W; on keep, the row is promoted to `agent_skill_reports`. No file-system write occurs at v1. The v2 file-system scaffolding path (write a skill script to `apps/memroos/src/lib/skills/`) is documented in `proposal-registry.ts` alongside the `skill_addition` entry as a `// v2: file-system scaffold` comment, and cross-referenced from the Phase 60 CONTEXT deferred section.

**`tool_routing_update`**: Phase 60 adds a `agent_tool_routing_policies` table (`agent_id` FK, `tool_name`, `context_pattern`, `preference_weight REAL`, `created_at`, `is_active`). The diff is a structured `{tool_name, context_pattern, new_weight, old_weight}` JSON object. Shadow apply writes a new row in the same transaction-and-rollback pattern as `agent_instruction_patch`.

All three mutation surfaces use the Phase 58 shadow-copy / SQLite-transaction strategy. No file-system mutations at v1 — this resolves the explicit Phase 58 handoff item ("file-system mutations for `skill_addition` will need the file-level snapshot strategy documented at that time").

### Decision 2 — Trajectory eval data shape and scorer interface

`AgentEvalTrace` (Phase 57) has a flat `toolCalls` array and single `input`/`output`. Trajectory evals require ordered multi-step state. Phase 60 introduces `TrajectoryTrace`:

```typescript
export interface TrajectoryStep {
  stepIndex: number;
  input: string;
  output: string;
  toolCalls?: AgentEvalTrace["toolCalls"];
  outcome?: AgentEvalTrace["outcome"];
  intermediateState?: Record<string, unknown>;
}

export interface TrajectoryTrace extends AgentEvalTrace {
  steps: TrajectoryStep[];
  finalOutput: string;
}
```

`TrajectoryTrace` extends `AgentEvalTrace` so existing single-turn scorer code receives the aggregate trace unchanged. The trajectory scorer is a new L2 scorer (`trajectory_multi_step`) registered in the scorer registry (scorer id `trajectory_multi_step`, layer `l2`). It operates on `steps` when present; when `steps` is absent or empty, it falls back to the single-turn path, making it safe to add to the default scorer list without breaking existing golden-set examples.

The trajectory scorer calls the Phase 57 LLM judge once per step and produces a per-step score, then averages into a single L2 `trajectory_multi_step` scorer result. The existing L2 rubric scorers (`rubric_5pt_faithful`, `rubric_5pt_useful`, `rubric_5pt_policy`) run on `finalOutput` unchanged.

### Decision 3 — Golden-set expansion strategy

All four role golden sets (`sales-50.jsonl`, `support-50.jsonl`, `finance-50.jsonl`, `ops-50.jsonl`) are currently 2-line skeleton stubs seeded in Phase 57. Phase 60 expands each to ~50 examples authored as committed `.jsonl` files. Golden-set examples that include multi-step agent scenarios use the `TrajectoryTrace`-shaped `trace` field (i.e., `trace.steps` is present). Single-turn examples without `steps` continue to work with existing scorers.

Human-validated agreement ≥ 0.85 is required before any golden set is used in a Phase 60 autogen loop run. The drift guard from Phase 57 enforces this at eval time. Phase 60 documents the authorship and validation date in a `golden-sets/MANIFEST.md` file.

### Decision 4 — Named preset profiles

Three presets ship with explicit weight vectors:

| Preset | L1 | L2 | L3 | Intended use |
|---|---|---|---|---|
| `outcome-weighted` | 0.1 | 0.4 | 0.5 | Sales / ops agents where business completion is the primary signal |
| `quality-weighted` | 0.2 | 0.6 | 0.2 | Support agents where rubric quality (faithful, useful, policy) dominates |
| `compliance-weighted` | 0.4 | 0.4 | 0.2 | Finance agents where tool-call schema correctness (L1) is critical |

These are stored in `memroos.eval.yaml` under a `weight_presets:` block:

```yaml
weight_presets:
  outcome-weighted:   { l1: 0.1, l2: 0.4, l3: 0.5 }
  quality-weighted:   { l1: 0.2, l2: 0.6, l3: 0.2 }
  compliance-weighted: { l1: 0.4, l2: 0.4, l3: 0.2 }

active_preset: null   # null = use manual weights block; set to a preset name to override
```

`active_preset: null` means the `weights:` block is used as-is (Phase 57 default). When `active_preset` is set to a preset name, the config reader overrides `weights` from the named preset at load time. A UI selector in the `/evals` config panel (`PresetSelector` component) reads available presets and POSTs to `/api/evals/config` to flip `active_preset`. This extends the Phase 57 config surface without a new route or page.

The preset config block is also persisted to the `eval_config_snapshots` table (Phase 57) so per-run config hashes include the active preset name.

### Decision 5 — Trajectory scorer L2 integration path

The trajectory scorer feeds the L2 layer as an additional scorer alongside the three existing rubric scorers. The composite W formula (`W = 0.2·L1 + 0.5·L2 + 0.3·L3`) is unchanged. Within L2, the scorer registry already averages scorer results; adding `trajectory_multi_step` to `scorers.l2_quality` in `memroos.eval.yaml` is the only config change required.

When `trajectory_multi_step` is active on a golden-set example that has no `steps` field, the scorer returns a score equal to the single-turn rubric average (neutral — does not degrade non-trajectory golden-set examples). This makes the trajectory scorer safe to include in the default L2 scorer list for all roles.

### Decision 6 — v2 file-system skill scaffold path (deferred, documented)

The `skill_addition` v1 mutation target is a DB record only. The v2 path — writing a skill TypeScript module to `apps/memroos/src/lib/skills/<skill-id>/index.ts`, registering it in a skills manifest, and testing it in CI — requires a file-system isolated-apply strategy. The planned approach (documented in `proposal-registry.ts` comment, not implemented in Phase 60):

1. Write the proposed skill file to a staging directory: `apps/memroos/src/lib/skills/_proposed/<skill-id>/index.ts`
2. Rerun evals with an environment flag that resolves the staging skill instead of the canonical path
3. On keep: `mv` the staging file to the canonical path, add to skills manifest, trigger a build verification
4. On rollback: delete the staging file

This strategy is not implemented at v1. Phase 60 does not write any TypeScript skill files to disk.

---

## How Trajectory Evals Integrate into L2

The 3-layer composite W formula is unchanged. Within the L2 calculation, the scorer registry averages all registered L2 scorers. Phase 60 registers `trajectory_multi_step` as an L2 scorer. Its weight within L2 is controlled by the scorer registry's averaging logic (uniform average across all L2 scorers at v1). This means adding the trajectory scorer slightly dilutes each existing rubric scorer's contribution to L2 but does not change the L1/L2/L3 layer weighting itself.

Trajectory scoring is Phoenix-style in spirit: each step in `steps[]` is judged independently for faithfulness and on-task quality, producing a step-level score vector; the final trajectory score is the mean of step-level scores, penalized for steps that produced tool-call errors or intermediate escalations.

---

## How Named Weight Presets Work (end-to-end)

1. `memroos.eval.yaml` has a `weight_presets:` map and an `active_preset:` key.
2. `apps/memroos/src/lib/evals/config.ts` loads the YAML, resolves `active_preset` if set, and returns the effective `EvalWeights` (either from the manual `weights:` block or from the named preset).
3. The `/evals` config panel reads the active preset via `useEvalConfig()`. A new `PresetSelector` component renders a dropdown of available preset names plus a "custom" option (which shows the manual weight sliders).
4. Selecting a preset POSTs `{active_preset: "outcome-weighted"}` to `POST /api/evals/config`, which updates `memroos.eval.yaml` on disk (same path as Phase 57 config write).
5. All subsequent eval runs use the updated weights. The `configHash` field in `eval_runs` captures which preset was active, making preset-to-preset W comparisons deterministic and queryable.

---

## Open Questions

1. **Trajectory golden-set authorship workflow.** Phase 60 hand-authors 50-example `.jsonl` files. A semi-automated workflow (run a real agent, capture the trace, human-annotate it) would be faster and more realistic. Should Phase 60 include a simple trace-capture → annotation CLI tool, or is that a Phase 62 / external-API concern?

2. **Trajectory scorer step count bounds.** No upper bound on `steps[]` length is currently defined. A 100-step trajectory run by the judge N times is expensive. Should there be a `max_trajectory_steps` config cap, defaulting to e.g. 10? Defer to Phase 61 or address in Phase 60 implementation.

3. **Preset W regression across roles.** When an operator switches from `quality-weighted` to `outcome-weighted`, the composite W changes for all agents. Is there a need to record a "preset change event" in the audit log so W trends are interpretable? Phase 60 plan includes `active_preset` in `configHash`, but a dedicated event might be valuable.

4. **`agent_instructions` as the instruction mutation target.** The `registered_agents` table has a `metadata` JSON column that some integrations use to store agent config. If any downstream agent reads its instructions from `metadata`, the `agent_instructions` shadow table approach requires those agents to be updated to read from the new table. Phase 60 implementation must verify no existing agent pulls instructions from `metadata.system_prompt`.
