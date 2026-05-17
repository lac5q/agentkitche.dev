---
phase: 69
name: Context Source Contracts + Runtime Resilience
status: ready-for-planning
gathered: 2026-05-16
---

# Phase 69 Context: Context Source Contracts + Runtime Resilience

## Why This Exists

The May 2026 Memoroos dogfood incidents exposed a repeated failure pattern:
the product had powerful local memory/context behavior, but too much of it
depended on implicit local services, external cron entries, hidden app-specific
SQLite sources, and human memory of what should be indexed. When one lane
failed, the platform did not always make the failure visible before an agent
answered from stale or incomplete context.

This phase turns those incidents into product middleware so future installers
get the guardrails by default.

## Source Lessons

1. **Memory degradation must be visible before answer quality drops.**
   - mem0 writes can be queued/preserved while semantic recall is stale.
   - A reachable `/health` endpoint is not enough; health must include queue
     depth, vector-store connectivity, disk/SQLite state, and embedding
     round-trip behavior.

2. **Every context source needs a contract.**
   - Gmail was scheduled but silently failed because its runner called a missing
     virtualenv path.
   - Spark had the transcript, but source indexing lagged and project
     classification failed because attendees were empty.
   - qmd collections existed locally but were not declared as product-owned
     source contracts.

3. **Agents must not reconstruct missing source material.**
   - Meeting minutes should come from a transcript or source note.
   - If a source lane is stale or missing, the agent should stop with a source
     failure, not draft plausible minutes from adjacent decks.

4. **Local-only launchd/cron state must become installable middleware.**
   - `com.mem0.server`, qmd MCP, batch embedding, memory resilience monitors,
     and source ingestion jobs are runtime dependencies, not tribal knowledge.
   - Hardcoded plist paths and secrets inside launchd definitions are not a
     shippable install model.

5. **Regression drills belong in evals/UAT.**
   - Quota exhaustion, queued memory writes, missing source folders, stale qmd
     collections, missing local tool binaries, and missing virtualenvs should
     be recurring tests.
   - The eval should assert both behavior and visibility: API status, UI
     status, alertability, and safe answer behavior.

## Current Product Gaps

- Source ingestion scripts for Gmail/Spark/transcripts live in the external
  knowledge repo rather than a Memoroos-owned connector contract.
- qmd collection definitions are mostly local machine state rather than
  declarative product config.
- Runtime service installation is fragmented across local launchd plists,
  cron entries, external scripts, and manually set env values.
- Existing health surfaces do not yet model a unified "context availability"
  state across memory, qmd, and source ingestion.
- There is no source freshness gate that blocks source-backed answer tasks when
  the required collection is stale.

## Product Direction

Introduce a **Context Source Contract** abstraction. Each context lane declares:

- `id`
- `type` (`gmail`, `spark`, `qmd`, `local-folder`, `gdrive`, `calendar`, etc.)
- required tools and auth
- source path or connector endpoint
- ingest command
- index command
- freshness threshold
- searchable collection proof
- semantic memory proof, when applicable
- health checks
- alert rules
- eval/UAT fixture
- safe-answer behavior when stale

The product should then surface a single operator view:

```text
Gmail     fresh   indexed   searchable   last run 2026-05-17T00:16Z
Spark     fresh   indexed   searchable   last row 276
qmd       fresh   serving   searchable   20 collections
mem0      ok      queue 0   vector ok    last write round-trip ok
```

## Requirement Mapping

- CTX-01: declarative context source contracts
- CTX-02: source runner validation
- CTX-03: context health API and UI
- CTX-04: stale-source safe-answer gate
- CTX-05: runtime service installer
- CTX-06: env and secret propagation
- CTX-07: degradation eval/UAT suite
- CTX-08: source contract docs and templates

## Dependencies

- Phase 37 memory tiers provide the vector/graph/episodic memory foundation.
- Phase 39 setup experience provides the install and first-run wizard pattern.
- Phase 40 docs provide the install profile documentation surface.
- Phase 68 security boundary hardening should inform source connector trust
  boundaries and prompt-injection handling.

## Out of Scope

- Replacing qmd or mem0 as backends.
- Full connector marketplace/auth UX.
- Multi-tenant managed SaaS ingestion.
- Importing every external knowledge repo script unchanged.
