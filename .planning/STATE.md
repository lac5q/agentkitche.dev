---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: A2A Hub — Open Source
status: in_progress
stopped_at: Completed Phase 37 unified memory tiers
last_updated: "2026-05-05T10:53:00.000Z"
last_activity: 2026-05-05
progress:
  total_phases: 8
  completed_phases: 4
  total_plans: 10
  completed_plans: 10
  percent: 56
---

# State: Agent Kitchen

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-04 for v2.0)

**Core value:** Any agent framework plugs into Kitchen — and every agent, knowledge system, and skill becomes visible, connected, and self-improving.
**Current focus:** Phase 38 — Operating Profiles + Docker Full-Stack

## Current Position

Phase: 37 (unified-memory-mem0-graph-neo4j) — COMPLETE
Plan: 1 of 1
Status: Ready for Phase 38 planning/execution
Last activity: 2026-05-05

## Roadmap Summary (v2.0)

| Phase | Goal | Requirements |
|-------|------|--------------|
| 34 | Universal REST API + canonical agent registry | REST-01..06, REG-00..03 (10) — COMPLETE |
| 35 | A2A protocol + Google ADK support | A2A-01..08 (8) — COMPLETE |
| 36 | LangGraph orchestration (Python) + HIL | ORCH-01..07 (7) — COMPLETE |
| 37 | Unified memory — mem0 graph + Neo4j | MEM-01..05 (5) — COMPLETE |
| 38 | Env config audit + Docker full-stack | INFRA-01..04 (4) |
| 39 | Developer setup experience | DEV-01..02 (2) |
| 40 | Documentation + architecture diagrams | DOCS-01..08 (8) |
| 41 | OSS polish (license, CI, security, templates) | OSS-01..05 (5) |

**Completed so far:** Phase 34, Phase 35, Phase 36, and Phase 37.

## Performance Metrics

**Velocity:**

- Total v2.0 plans completed: 8
- Phase 35 execution completed: 2026-05-05
- Phase 36 completed: 2026-05-05
- Latest Phase 37 gate: memory tier tests, Kitchen lint, and build passed

## Accumulated Context

### Decisions (carried into v2.0)

- Production runs on port 3002 via `npm start -- --port 3002`; kill existing: `lsof -ti :3002 | xargs kill -9`
- After any build change: rebuild with `npm run build` then restart
- **Vector store architecture (CRITICAL):** QMD handles BM25/lexical only. ALL vector/semantic search uses Qdrant Cloud. `qmd embed` is FORBIDDEN.
- **Security:** No `execSync`/`exec` — use `execFileSync` or pure `fs/promises` only
- **mem0 writes:** Only via `POST http://localhost:3201/memory/add` — never touch `agent_memory` Qdrant directly
- **Group children:** Use `parentId` + `extent:'parent'` pattern (Phase 17 — already in codebase)
- **Qdrant stays cloud:** Never add local Qdrant to Docker compose — configured via QDRANT_URL + QDRANT_API_KEY env vars
- **Docker compose is for OSS users only:** Luis keeps native workflow (npm start, LaunchAgent, port 3002)
- **Memory stack is fixed for v2.0:** mem0 + Qdrant Cloud (vector) + Neo4j (graph, new) + SQLite (episodic). No pluggability until v3.0.

### v2.0 architectural constraints

- **LangGraph runs as a Python service** — separate process from Next.js, same pattern as Pipecat voice service
- **LangGraph checkpoint DB is `data/orchestration.db`** — SEPARATE from Kitchen's main SQLite DB to avoid cross-process lock contention
- **A2A adapter and LangGraph are separate layers** — A2A owns transport/protocol/task-state mapping; LangGraph owns routing policy, capability selection, retry, HIL. They communicate via internal API (ORCH-07 contract)
- **REG-00 canonical registry is complete** — A2A and REST registration both write through the same model
- **Phase 35 A2A layer is complete** — agent cards, A2A registration, durable task APIs, SSE, outbound delegation, ADK fixture, Registry/Flow surfacing
- **A2A adapter routing is protocol-driven** — `protocol: a2a` selects A2A; platform alone does not reroute legacy Gemini agents
- **Outbound A2A credentials are env-key-only** — metadata may name an env var, but UI must not render bearer/API-key values or raw auth headers
- **ADK proof fixture is optional** — `examples/adk-a2a-agent/` is not imported by Kitchen startup

### Pending Todos

- Phase 38: add operating profiles and Docker full-stack wiring for Kitchen, mem0, Neo4j, voice, knowledge MCP, and orchestration.

### Blockers/Concerns

- Production build has a non-blocking Turbopack NFT warning involving `/api/apo` — documented in code comment (OPSGW-02)
- Lint passes with 12 pre-existing warnings unrelated to Phase 35
- Full tests pass with a pre-existing Vitest hoisting warning in `src/app/api/agents/__tests__/card.test.ts`
- GitNexus embeddings partial (285/473) — upstream crash bug (abhigyanpatwari/GitNexus#824)

## Session Continuity

Last session: 2026-05-05T09:27:41Z
Stopped at: Completed 35-04-PLAN.md
Resume file: None
Next action: Phase 38 operating profiles + Docker full-stack, with code-review gate after the phase
