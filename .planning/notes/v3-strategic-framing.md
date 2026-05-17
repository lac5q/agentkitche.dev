---
title: v3 Strategic Direction — Compliance Platform + Finance Vertical
date: 2026-05-16
context: Scoped via gsd-explore session — regulated finance startup client driving requirements
---

# v3 Strategic Direction

## Decision

v3 = compliance infrastructure done right once + finance reconciliation as the flagship vertical.

Other industries (healthcare, legal, ops) follow the same pattern — new adapter + golden set.
Do NOT bake finance-specific logic into the core. Keep it in the vertical layer.

## Compliance primitives (core, industry-agnostic)
- RBAC: admin / operator / reviewer roles
- Immutable audit log: every agent decision traceable, reason attached, append-only
- HIL escalation queue: operator-visible, approve/reject with audit record
- Self-hosted Docker profile: data never leaves their environment
- Rename: Memroos → Memroos (product name, codebase + docs)

## Finance vertical (reference implementation)
- Bank transaction reconciliation governance
- Agent matches/flags/escalates transactions; every decision logged immutably
- Finance-specific: transaction L3 adapter, reconciliation golden sets, finance UI terminology
- Target client: regulated finance startup, SOC 2 later

## CoVe (Chain-of-Verification)
- Inference-time scaffolding, not model-specific
- 4-step: draft → verification questions → independent fact-checks → revised answer
- Registered as callable module in agent runtime AND as eval scorer
- Works on Hermes, Claude API, any endpoint

## OSS appeal
- Other businesses see "finance reconciliation governance runs on this" and trust it
- Compliance primitives are the same across regulated industries
- Finance vertical is the proof point, not the constraint
