---
title: Eval Engine + Self-Improvement as an external product surface
planted_date: 2026-05-14
trigger_condition: "After v2.5 phases 57–60 ship and the eval engine is dogfooded on MemroOS itself; before phase 62 (public API)"
related_phases: [62]
---

# Eval Engine as Product

## Idea

The same 3-layer composite W + SEAL substrate that MemroOS uses internally is sold to mid-market companies (50–500 employees) deploying their own agents. MemroOS becomes the eval + self-improvement plane, agent-framework-agnostic.

## What needs to be decided before phase 62

- **Packaging.** Bundled with MemroOS Hub (single offering) vs separate "MemroOS Evals" SKU. Argument for bundled: the eval signal is what makes the memory + agent system actually trustworthy — splitting them weakens both. Argument for separate: companies with existing memory systems (LangChain, mem0 standalone) still want the eval/learning loop.
- **Pricing axis.** Per-eval-run? Per-agent-monitored? Per-1k-judge-calls? Flat seat? Mid-market won't accept usage-based-only — they want predictable budgets.
- **Trace ingestion.** Do we accept arbitrary OpenTelemetry agent traces? OpenInference spec? Custom JSON? Phoenix's choice (OpenInference) is the only emerging standard.
- **Judge model cost pass-through.** Whose API key pays for the LLM-as-judge calls — ours (markup) or BYO key (cleaner, slower close)?
- **Golden set marketplace.** Do we curate role-specific golden sets ourselves, accept community contributions, or sell verticalized sets (legal, healthcare, fintech) as upsell?
- **Compliance posture.** Mid-market in regulated verticals will ask: SOC 2, data residency, judge-model on-prem option. What's the floor for v1?
- **Competitive framing.** Braintrust / LangSmith / Arize Phoenix are tools without opinions. MemroOS's wedge is the **opinionated default** (3-layer W, business-KPI L3, role-based golden sets, autogen loop). Don't let messaging drift into "another eval platform."

## Why this is a seed and not a phase yet

The product surface only matters once the internal substrate is proven. If phase 60 (agent autogen) shows W is stable and the SEAL loop actually improves agents in production, the external product story is real. If it doesn't, packaging is moot.
