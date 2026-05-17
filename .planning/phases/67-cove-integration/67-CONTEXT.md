---
phase: 67
name: CoVe Integration
created: 2026-05-17
source: ROADMAP v3.0
---

# Phase 67 Context: CoVe Integration

## Product Intent

Chain-of-Verification should be a reusable reliability module for any agent
runtime and a first-class eval scorer. It should reduce hallucination risk by
running draft, verification-question generation, independent checks, and answer
revision through a provider-neutral endpoint abstraction.

## Dependencies

- Phase 57: eval scorer registry and W scoring.
- Phase 63: Memroos naming/auth baseline.

## Requirements

- COVE-01: callable `cove(agentFn, config)` wrapper.
- COVE-02: registered eval scorer measuring hallucination delta vs baseline.
- COVE-03: provider-neutral support for Claude API, Ollama/Hermes, and
  OpenAI-compatible endpoints.

## Decisions

1. The wrapper accepts injected LLM call functions in tests to keep verification
   deterministic and network-free.
2. The runtime module returns a structured verification trace so audit/eval
   surfaces can inspect which claims changed.
3. The scorer compares baseline and CoVe-enhanced traces rather than hardcoding
   model-specific hallucination rules.
4. Config lives beside eval config to keep scorer registration and runtime
   behavior aligned.

## Verification Contract

- Unit-test the 4-step pipeline with fake LLM clients.
- Unit-test scorer registration and hallucination-delta calculation.
- Verify config parsing for enabled/max questions/parallel verification/judge
  endpoint.
- Demo the same factual prompt with and without CoVe using deterministic test
  fixtures.
