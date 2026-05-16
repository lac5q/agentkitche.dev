---
title: Eval Engine — 3-Layer Composite W (decision record)
date: 2026-05-14
context: Milestone v2.5 scoping — eval framework + self-improvement substrate, dogfood internally + ship externally
related_phases: [57, 58, 59, 60, 61, 62]
status: locked
---

# Eval Engine — 3-Layer Composite Scalar `W`

## Decision

MemroOS adopts a **3-layer composite scalar `W`** as the default eval signal for all autogen learning loops (memory policy, agent instructions, user-deployed agents). Same scalar drives keep/discard in Karpathy-style autoresearch loops.

```
W = 0.2·L1 + 0.5·L2 + 0.3·L3      (normalized 0–1)
```

| Layer | Measures | How | Drift behavior |
|---|---|---|---|
| **L1 Capability** | Tool-call correctness, JSON schema adherence, on-task | Deterministic code evals (Hermes-style) | None — deterministic |
| **L2 Quality** | Faithful, useful, on-policy | LLM-as-judge, pinned cross-family model, 5-pt rubric, golden set | Bounded by golden-set agreement gate |
| **L3 Outcome** | Did it resolve the business task? | Trace post-hoc: completion / escalation / TTR / operator approval / cost-per-task | None — observed signal |

## Why this shape (and not just LLM-as-judge)

1. **Hermes (Nous Research) is a model-builder's harness**, not a business-ops scoring system. Useful as inspiration for L1 only.
2. **Mid-market eval platforms (Braintrust, LangSmith, Arize Phoenix) have converged on LLM-as-judge + rubric + golden set + pinned model.** Phoenix is the closest architectural fit — only one with first-class agent-trajectory evals OOTB.
3. **LLM-as-judge alone is not stable enough for an autogen loop.** Judge drift, position bias, self-preference, and rubric gaming are well-documented. The L1 + L3 deterministic layers anchor the scalar against L2 drift.
4. **Business-ops KPIs have a canonical starter set** (Anthropic + Fin/Intercom): completion rate, escalation rate, TTR, approval rate, cost-per-task. L3 maps to these directly so `W` aligns to *company success*, not just rubric quality.

## Mitigations (settled industry pattern, not novel)

- **Position bias** → swap augmentation (score both orderings, tie on disagreement).
- **Self-preference bias** → judge model MUST be from a different family than the agent under eval.
- **Temporal drift** → version-pin judge by model hash + prompt template version. Rotation requires explicit re-baseline.
- **Rubric gaming / drift guard** → before `W` is trusted in a loop iteration, run a golden-set agreement check. If judge-vs-human agreement drops below **85%**, halt the loop and flag for operator.
- **Pointwise scoring** (required for stable scalar) — pairwise is more stable for ranking but doesn't produce a usable autogen signal.

## Config surface — default + configurable

`memroos.eval.yaml` at repo root, mirrored by UI for non-engineers:

```yaml
judge_model:
  provider: anthropic
  model: claude-haiku-4-5-20251001     # pinned — rotation = explicit re-baseline
  prompt_template_version: v1

golden_sets:
  default: ./golden-sets/business-ops-50.jsonl
  per_role:
    sales:   ./golden-sets/sales-50.jsonl
    support: ./golden-sets/support-50.jsonl
    finance: ./golden-sets/finance-50.jsonl
    ops:     ./golden-sets/ops-50.jsonl

scorers:
  l1_capability: [tool_call_schema, json_valid, on_task]
  l2_quality:    [rubric_5pt_faithful, rubric_5pt_useful, rubric_5pt_policy]
  l3_outcome:    [completion_rate, escalation_rate, ttr_p50, operator_approval, cost_per_task]

weights:
  l1: 0.2
  l2: 0.5
  l3: 0.3

drift_guard:
  golden_agreement_floor: 0.85       # halt loop below this
  judge_rotation_requires_rebaseline: true

agents:
  # per-agent override
  acme_sales_agent:
    eval:
      golden_set: ./golden-sets/acme-sales-200.jsonl
      weights: { l1: 0.1, l2: 0.4, l3: 0.5 }   # outcome-weighted
```

## Reconciliation with phase 57 (pre-existing plan)

Phase 57's original scope was **memory-only SEAL** with `recallAtK` as its scalar. That's now subordinate:

- **Phase 57 (rewritten)**: Eval Engine Core — scorer registry, composite W, pinned judge, golden-set framework, drift guard, config surface. Memory recall becomes one L1/L2 scorer plugged into the registry.
- **Phase 58**: SEAL Self-Improvement Substrate — generic over what is mutated (proposal types are polymorphic).
- **Phase 59**: Memory autogen learnings (the old phase 57 SEAL work, riding on 58).
- **Phase 60**: Agent autogen learnings — extends 58 with `agent_instruction_patch`, `skill_addition`, `tool_routing_update` proposal types.
- **Phase 61**: L3 outcome layer — trace metrics, CRM/helpdesk/finance adapters, per-company KPI weighting.
- **Phase 62**: Public Eval API + SDK — framework-agnostic external product surface, dogfooded by 59/60.

## Target user

Mid-sized companies (50–500 employees) going agentic. No ML eval team. OOTB signal must be real (50-example default golden set per role ships in the box). Configuration must be tweakable without writing scoring code.

## Sources

- [Hermes 4 Technical Report — Nous Research](https://nousresearch.com/wp-content/uploads/2025/08/Hermes_4_Technical_Report.pdf)
- [Hermes Agent — Environments & Benchmarks](https://hermes-agent.nousresearch.com/docs/developer-guide/environments)
- [Arize Phoenix vs Braintrust comparison](https://arize.com/docs/phoenix/resources/frequently-asked-questions/braintrust-open-source-alternative-llm-evaluation-platform-comparison)
- [LangSmith vs Arize vs Braintrust 2026](https://anudeepsri.medium.com/langsmith-vs-arize-vs-braintrust-e397e4728a76)
- [LLM-as-Judge — Comet](https://www.comet.com/site/blog/llm-as-a-judge/)
- [Rubric-Based Evals & LLM-as-a-Judge methodologies](https://medium.com/@adnanmasood/rubric-based-evals-llm-as-a-judge-methodologies-and-empirical-validation-in-domain-context-71936b989e80)
- [Anthropic — Demystifying Evals for AI Agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [Fin AI — Enterprise AI Agent KPI Framework](https://fin.ai/learn/ai-agent-kpis-enterprise-performance-metrics-framework)
