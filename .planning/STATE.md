---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: A2A Hub — Open Source
status: Roadmap defined — ready for /gsd-plan-phase 34
stopped_at: —
last_updated: "2026-05-04T00:00:00.000Z"
last_activity: 2026-05-04
progress:
  total_phases: 8
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# State: Agent Kitchen

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-04 for v2.0)

**Core value:** Any agent framework plugs into Kitchen — and every agent, knowledge system, and skill becomes visible, connected, and self-improving.
**Current focus:** v2.0 A2A Hub — Open Source (Phases 34-41)

## Current Position

Phase: 34 — Universal REST API + Canonical Agent Registry (not started)
Plan: —
Status: Roadmap defined; ready for `/gsd-plan-phase 34`
Last activity: 2026-05-04 — v2.0 roadmap created (8 phases, 42 requirements mapped, 100% coverage)

## Roadmap Summary (v2.0)

| Phase | Goal | Requirements |
|-------|------|--------------|
| 34 | Universal REST API + canonical agent registry | REST-01..06, REG-00..03 (10) |
| 35 | A2A protocol + Google ADK support | A2A-01..08 (8) |
| 36 | LangGraph orchestration (Python) + HIL | ORCH-01..07 (7) |
| 37 | Unified memory — mem0 graph + Neo4j | MEM-01..05 (5) |
| 38 | Env config audit + Docker full-stack | INFRA-01..04 (4) |
| 39 | Developer setup experience | DEV-01..02 (2) |
| 40 | Documentation + architecture diagrams | DOCS-01..08 (8) |
| 41 | OSS polish (license, CI, security, templates) | OSS-01..05 (5) |

**Total:** 42/42 requirements mapped; 0 orphans.

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: —
- Total execution time: —

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

### v2.0 architectural constraints (new)

- **LangGraph runs as a Python service** — separate process from Next.js, same pattern as Pipecat voice service
- **LangGraph checkpoint DB is `data/orchestration.db`** — SEPARATE from Kitchen's main SQLite DB to avoid cross-process lock contention
- **A2A adapter and LangGraph are separate layers** — A2A owns transport/protocol/task-state mapping; LangGraph owns routing policy, capability selection, retry, HIL. They communicate via internal API (ORCH-07 contract)
- **REG-00 (canonical registry model)** must land in Phase 34 before A2A registration in Phase 35 — A2A and REST registration are both adapters onto the same model

### Pending Todos

None.

### Blockers/Concerns

- Voice server is a standalone Python Pipecat service — not embedded in Next.js; requires separate process management. LangGraph in Phase 36 follows the same pattern.
- Production build has a non-blocking Turbopack NFT warning involving `/api/apo` — documented in code comment (OPSGW-02)
- GitNexus embeddings partial (285/473) — upstream crash bug (abhigyanpatwari/GitNexus#824)

## Session Continuity

Last session: 2026-05-04
Stopped at: Roadmap creation complete
Resume file: None
Next action: `/gsd-plan-phase 34` (Universal REST API + Canonical Agent Registry)
