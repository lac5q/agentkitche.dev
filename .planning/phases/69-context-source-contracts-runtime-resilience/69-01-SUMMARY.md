---
phase: 69
plan: 01
title: Context Source Contracts + Runtime Resilience
status: complete
completed: 2026-05-17
requirements: [CTX-01, CTX-02, CTX-03, CTX-04, CTX-05, CTX-06, CTX-07, CTX-08]
---

# Phase 69 Plan 01 — Context Source Contracts + Runtime Resilience: Summary

## Outcome

Memoroos now treats external context lanes as explicit product contracts.
Operators can inspect qmd, Gmail, Spark, mem0, and local-folder source health
through an API and Library UI panel, source-backed workflows can fail closed
with `SOURCE_MISSING` or `SOURCE_STALE`, and macOS runtime checks can be
installed from generated launchd jobs instead of hand-edited local plists.

## What Was Done

- Added `context-sources.config.json` with source contracts for qmd, Gmail,
  Spark, mem0, and local-folder lanes.
- Added `apps/kitchen/src/lib/context-sources.ts` for contract loading,
  environment-aware path resolution, source freshness evaluation, document
  counting, tool/env validation, and safe-answer gating.
- Added `GET /api/context/health` with per-source
  `ok|stale|missing|degraded|disabled` status, age, doc count, qmd collection,
  last marker, last error, repair hint, and safe-answer policy.
- Added a Context Sources panel to the Library/Memory area with freshness and
  repair evidence.
- Added `scripts/install-runtime-services.mjs` with `check`, `install`,
  `status`, and `uninstall` commands for the context-health launchd job.
- Added `npm run eval:context-sources` and Kitchen workspace wiring.
- Added `.env.example` fields for context-source config, Gmail ingestion,
  Spark transcript DB, and local source paths.
- Added `docs/context-sources.md` with enablement, troubleshooting, privacy,
  and new-source contract guidance.

## Verification

- `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm --prefix apps/kitchen run test -- src/lib/__tests__/context-sources.test.ts src/app/api/context/__tests__/health-route.test.ts --run`
  - 2 files, 5 tests passed
- `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm run eval:context-sources`
  - passed
- `PATH="/opt/homebrew/opt/node@22/bin:$PATH" node scripts/install-runtime-services.mjs check`
  - passed; generated plist lint succeeded
- `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm --prefix apps/kitchen run typecheck`
  - passed

## Notes

- Gmail, Spark, and local-folder are shipped disabled by default so clean OSS
  installs do not require Luis-specific paths or credentials.
- `CONTEXT_SOURCES_CONFIG` is supported for alternate deployments and tests.
- The runtime installer currently owns the context-health eval job; broader
  service migration can reuse the same generated-plist pattern in later work.
