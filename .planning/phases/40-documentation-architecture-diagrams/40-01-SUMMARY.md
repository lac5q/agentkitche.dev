---
phase: 40-documentation-architecture-diagrams
plan: 01
subsystem: documentation
status: complete
requirements_addressed: [DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05, DOCS-06, DOCS-07, DOCS-08, PROFILE-02, PROFILE-03, PROFILE-04]
---

# Phase 40 Summary: Documentation + Architecture

## What Landed

- Rewrote `README.md` as the OSS front door with quickstart, architecture diagram, security model, A2A-vs-REST guidance, and registry clarification.
- Added `docs/architecture.md` with system and data-store architecture.
- Added `docs/install-profiles.md` with local, single-host, private-network, cloud HTTPS, and custom profile guidance.
- Added `docs/rest-api.md` covering registry, A2A, runtime reporting, memory, and orchestration endpoints.
- Added `docs/memory-architecture.md` covering vector, graph, and episodic tiers.
- Added integration guides for Claude Code, Google ADK, LangGraph, CrewAI, and AutoGen.

## Verification

- Documentation files exist for DOCS-01 through DOCS-08.
- Markdown links point to repository-local docs.
- Mermaid diagrams are fenced and text-only.
- Phase 40 explicitly documents why the registry UI may show fewer agents than legacy config.

## Residual Notes

- License, contribution guide, security policy, issue templates, and CI remain Phase 41.
- Rust rebuild discussion is intentionally deferred to v3 planning.
