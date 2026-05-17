---
phase: 41
name: OSS Polish
status: planned
created: 2026-05-11
requirements: [OSS-01, OSS-02, OSS-03, OSS-04, OSS-05]
---

# Phase 41 Context: OSS Polish

## Roadmap Review Verdict

The v2.0 roadmap makes sense for the current stack. Phases 34-40 have already put the product foundation in place: canonical agent registry, A2A transport, LangGraph orchestration, unified memory, operating profiles, Docker compose, setup flow, and OSS-facing docs.

The ordering after Phase 41 has been reprioritized:

1. v2.1 Security + Trust Layer
2. v2.2 LLM Optimization + Evaluation
3. v2.3 Agent Runtime Enhancements
4. v2.4 Performance + Caching

The right immediate execution target is still minimal Phase 41 OSS hygiene, but it should stay narrow. Do not expand Phase 41 into the full security layer; that belongs in v2.1.

## Stack Fit

- Root package delegates to the Memroos workspace in `apps/memroos`.
- Memroos is Next.js App Router, React 19, TypeScript, Tailwind, Vitest, and Playwright.
- Python services live under `services/`: `knowledge-mcp`, `memory`, `orchestration`, and `voice-server`.
- Docker compose already defines Memroos, mem0, Neo4j, orchestration, voice, and Knowledge MCP.
- GitHub Actions already has baseline CI and secret guard workflows, but it does not yet satisfy the Phase 41 public CI contract.

## Current OSS Gap

- `LICENSE` already exists at repo root, satisfying most of OSS-01.
- `CONTRIBUTING.md` is missing.
- `SECURITY.md` is missing.
- `.github/ISSUE_TEMPLATE/` is missing.
- `.github/workflows/ci.yml` runs tests and build, but not explicit lint/typecheck or Docker compose smoke.
- `apps/memroos/package.json` has no explicit `typecheck` script; Next build performs type validation, but Phase 41 asks for typecheck as a named CI gate.

## Roadmap Hygiene Notes

- `.planning/ROADMAP.md` had stale progress-table rows for Phases 35-40. The phase list, requirements file, state file, summaries, and reviews all point to Phases 34-40 being complete. The progress table was updated to match that authority.
- The original v2.1 performance/caching work has been moved to v2.4 because security and LLM choice quality are more strategic bottlenecks.
- The Agent Shield / Iris security proposal is now v2.1, not a Phase 41 add-on.
- `4d03fae` on `main` shipped the first Iris slice: Agent Shield/Iris planning notes, `iris-scanner.ts`, prompt-injection pre-flight rules, Dispatch/A2A wiring, audit-compatible blocking, and tests. v2.1 should treat this as Phase 42 foundation already landed and continue with Phase 43 Tool Permission Guard.
- Model choosing optimization moved out of backlog into v2.2.
- The agent-runtime proposal moves behind security and LLM optimization as v2.3.

## Execution Shape

Phase 41 should run as two plans:

1. `41-01`: Public contribution artifacts - CONTRIBUTING, SECURITY, issue templates, and license/readme consistency.
2. `41-02`: Public CI gate - explicit typecheck/lint/test/build gates plus Docker compose smoke.

This sequencing keeps docs and policy changes separate from CI behavior changes and lets the first plan land without waiting on Docker/CI iteration.
