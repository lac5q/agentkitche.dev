---
phase: 66
plan: 01
title: Self-hosted Hardening + Compliance Posture
status: complete
completed: 2026-05-17
requirements: [INFRA-01, INFRA-02]
---

# Phase 66 Plan 01 — Self-hosted Hardening + Compliance Posture: Summary

## Outcome

Memroos now has an explicit self-hosted compliance posture: data-residency mode
fails closed for external judge providers, local Ollama/vLLM/OpenAI-compatible
judge endpoints are accepted, compliance controls are visible under Settings,
and admin changes write immutable audit evidence.

## What Was Done

- Added `lib/compliance/data-residency.ts` with local endpoint detection,
  data-residency enforcement, and compliance posture summaries.
- Added data-residency enforcement to `judgeTrace()` while preserving existing
  deterministic judge behavior when residency mode is disabled.
- Extended eval config with `judge_model.local_endpoint` and a `compliance:`
  block for data residency, audit retention, allowed local hosts, and enabled
  adapters.
- Added `GET/PUT /api/admin/compliance` with admin-only access and
  `admin.compliance_updated` audit entries.
- Added Settings -> Compliance UI for residency, audit retention, adapter status,
  and local judge posture.
- Added `.env.example` and compose env wiring for local judge/data-residency
  operation.

## Verification

- `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm --prefix apps/memroos run test -- src/lib/compliance src/app/api/admin/compliance --run`
  - 2 files, 8 tests passed
- `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm --prefix apps/memroos run test -- src/lib/evals src/lib/compliance src/app/api/admin/compliance --run`
  - 4 files, 22 tests passed
- `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm --prefix apps/memroos run typecheck`
  - passed
- `START_SERVICES=0 SKIP_QDRANT_CHECK=1 INSTALL_MEMORY_RESILIENCE=0 ./setup.sh`
  - blocked by pre-existing Qdrant env guard: `Required env QDRANT_API_KEY is not configured in .env`

## Notes

- The phase preserves the existing project constraint that Qdrant Cloud remains
  the default vector-store posture. Data-residency judge enforcement is complete;
  a local vector-store compose profile remains a larger infrastructure decision.
- The setup smoke created/updated ignored `.env`; it was not staged.
