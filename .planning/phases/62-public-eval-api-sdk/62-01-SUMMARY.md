---
phase: 62
plan: 01
title: Public Eval API + SDK
status: partial
completed: 2026-05-16
requirements: [API-01, API-02, API-03, API-04, API-05, API-06]
---

# Phase 62 Plan 01 — Public Eval API + SDK: Summary

> Reconstructed during the 2026-05-16 reconciliation (see 57-01-SUMMARY.md note).

## Outcome

Tenant-isolated public HTTP eval surface plus TS and Python SDKs are
implemented with real logic and passing tests. Dogfood refactor wiring
(`seal/sdk-eval-service.ts`) is in place.

## What Was Done

- `lib/public-api/{auth,rate-limiter}.ts`, OpenInference trace mapper,
  `/api/public/v1/{traces,runs,proposals}`.
- `tenants` / `tenant_api_keys` tables; additive `tenant_id` columns + indexes
  across v2.5 tables.
- `packages/sdk-ts` (client + tests) and `packages/sdk-py` (client + tests).
- Reconciliation: tenant/public API tests pass; no code fix required here.

## Gaps / Deferred

- Route paths diverge from the plan (`/v1/traces` vs planned `/v1/eval`);
  reconcile the contract before publishing the SDK quickstart.
- `docs/eval-quickstart.md` not verified present — confirm or author before any
  external/customer exposure.
- External product packaging remains deferred (see
  `.planning/seeds/eval-engine-as-product.md`).
