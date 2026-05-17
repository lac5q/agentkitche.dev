---
phase: 65
name: Finance Reconciliation Vertical
created: 2026-05-17
source: ROADMAP v3.0
---

# Phase 65 Context: Finance Reconciliation Vertical

## Product Intent

Memroos should prove the compliance platform on a concrete regulated workflow:
bank transaction reconciliation. Transaction events must feed the existing L3
business-outcome layer, reconciliation examples must exercise the eval/drift
guard path, and finance-mode UI/API labels should describe the domain in
operator language.

## Dependencies

- Phase 61: L3 adapter pattern and `business_outcome_events` table exist under
  `apps/memroos/src/lib/l3`.
- Phase 64: immutable audit entries and HIL escalation queues exist and should
  capture reconciliation decisions and exceptions.

## Requirements

- FIN-01: Transaction adapter ingests bank transaction events from CSV or webhook
  and persists finance outcome rows keyed by `correlation_id`.
- FIN-02: Reconciliation golden sets ship with match, mismatch, and escalation
  examples; drift guard can validate agreement at 0.85.
- FIN-03: Finance terminology is configurable so UI/API copy can use
  transaction, reconciliation, and exception vocabulary.

## Decisions

1. Reuse the existing L3 finance lane instead of creating a parallel finance DB.
2. Ship deterministic mock/demo data so verification does not require a live bank
   connection or customer data.
3. Treat mismatch/exception rows as audit-worthy events and open HIL escalations
   when confidence or status requires human review.
4. Keep finance terminology opt-in via eval/config so existing generic eval
   screens remain unchanged for non-finance users.

## Verification Contract

- Unit-test CSV parsing, webhook normalization, business outcome writes, audit
  entries, and HIL exception creation.
- Run the finance golden set through the eval/drift harness without external
  model calls.
- Exercise an end-to-end mock run for 100 transactions through a local API or
  service entrypoint.
