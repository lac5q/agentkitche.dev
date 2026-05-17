---
phase: 67
plan: 01
title: CoVe Integration
status: complete
completed: 2026-05-17
requirements: [COVE-01, COVE-02, COVE-03]
---

# Phase 67 Plan 01 — CoVe Integration: Summary

## Outcome

Chain-of-Verification is now available as a provider-neutral runtime module and
registered eval scorer. The implementation supports draft generation wrappers,
verification-question generation, independent checks, revised answers, and
OpenAI-compatible local endpoints for Ollama/vLLM/Hermes style deployments.

## What Was Done

- Added `apps/memroos/src/lib/cove/` with:
  - `cove(agentFn, config)` runtime wrapper.
  - `runCovePipeline()` for draft -> questions -> checks -> revised answer.
  - `createOpenAICompatibleCoveClient()` for local OpenAI-compatible endpoints.
  - `cove_hallucination_delta` eval scorer.
- Registered the CoVe scorer in the built-in eval scorer registry.
- Added `cove:` config to `memroos.eval.yaml` and eval config parsing/
  formatting support.
- Added deterministic tests for pipeline steps, wrapper behavior, provider
  adapter shape, scorer registration, hallucination-delta scoring, and config
  parsing.
- Hardened the admin compliance route test so it restores `memroos.eval.yaml`
  after mutation tests.

## Verification

- `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm --prefix apps/memroos run test -- src/lib/cove --run`
  - 1 file, 6 tests passed
- `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm --prefix apps/memroos run test -- src/lib/evals src/lib/cove --run`
  - 3 files, 20 tests passed
- `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm --prefix apps/memroos run test -- src/app/api/admin/compliance --run`
  - 1 file, 3 tests passed; verified config restoration
- `PATH="/opt/homebrew/opt/node@22/bin:$PATH" npm --prefix apps/memroos run typecheck`
  - passed

## Notes

- CoVe is disabled by default. The scorer is registered but only participates in
  scoring when config includes `cove_hallucination_delta` in an eval layer.
- Live provider calls are intentionally not required by tests; provider behavior
  is covered through the OpenAI-compatible request adapter with an injected
  fetch implementation.
