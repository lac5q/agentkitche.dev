---
gsd_state_version: 1.0
milestone: v2.5
milestone_name: Eval Engine + Self-Improvement Platform
status: v2.5 NEAR-COMPLETE — golden sets + paths + phase 59 closed; 1 architectural gap
stopped_at: v2.5 finishing pass 2026-05-16
last_updated: "2026-05-16T13:44:34.665Z"
last_activity: 2026-05-16 — finished v2.5 gaps: golden sets, path ratification, phase 59 retro
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 5
  completed_plans: 0
  percent: 0
---

# State: Agent Kitchen

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-04 for v2.0)

**Core value:** Any agent framework plugs into Kitchen — and every agent, knowledge system, and skill becomes visible, connected, and self-improving.
**Current focus:** v2.5 reconciliation — large uncommitted partial implementation needs decision (fix-then-commit vs WIP-park)

## Current Position

Phase: v2.5 (57-62) — COMMITTED, build green, tests green; PARTIAL feature completeness
Plan: PARTIAL SUMMARYs written for 57,58,60,61,62 (phase 59 unplanned, no plan)
Status: build passes, 593/593 tests; golden sets ~4% (top follow-up), no dogfood W-lift
Last activity: 2026-05-16 — reconciliation complete + committed

## Roadmap Summary (v2.0)

| Phase | Goal | Requirements |
|-------|------|--------------|
| 34 | Universal REST API + canonical agent registry | REST-01..06, REG-00..03 (10) — COMPLETE |
| 35 | A2A protocol + Google ADK support | A2A-01..08 (8) — COMPLETE |
| 36 | LangGraph orchestration (Python) + HIL | ORCH-01..07 (7) — COMPLETE |
| 37 | Unified memory — mem0 graph + Neo4j | MEM-01..05 (5) — COMPLETE |
| 38 | Env config audit + Docker full-stack | INFRA-01..04 + PROFILE-01..04 — COMPLETE |
| 39 | Developer setup experience | DEV-01..02 + PROFILE-01,02,04 — COMPLETE |
| 40 | Documentation + architecture diagrams | DOCS-01..08 + PROFILE-02,03,04 — COMPLETE |
| 41 | OSS polish (license, CI, security, templates) | OSS-01..05 (5) |

**Completed so far:** Phase 34 through Phase 56.

## Performance Metrics

**Velocity:**

- Total v2.0-v2.4 plans completed: 29
- Phase 35 execution completed: 2026-05-05
- Phase 36 completed: 2026-05-05
- Latest Phase 40 gate: docs link/content review, markdown grep checks, Kitchen lint, and build passed

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

### v2.5 ACTUAL Status (reconciliation audit 2026-05-16)

Prior STATE.md claimed "all 6 phases shipped" — that was FALSE. No SUMMARY.md
exists for any phase; all work is uncommitted; production build is broken.
Verdict: coherent partial work (real logic, not scaffolding), NOT shippable.

| Phase | Name | Actual Status |
|-------|------|---------------|
| 57 | Eval Engine Core | PARTIAL — engine/scorers/judge real; golden set ~3/50 rows |
| 58 | SEAL Self-Improvement | PARTIAL — full loop coded; 4 real test failures (audit FK, eval lookups) |
| 59 | Memory Autogen | UNPLANNED — code exists, NO phase dir/plan/contract |
| 60 | Agent Autogen | PARTIAL/MISSING — golden sets 2/50 each; no dogfood W-lift evidence |
| 61 | Business-Ops L3 | PARTIAL — schema/code column mismatch will break L3 at runtime |
| 62 | Public Eval API + SDK | PARTIAL — SDKs real, route paths diverge from plan |

Scope creep outside v2.5: phases 63 (Rename+Team Auth) & 64 (Immutable Audit+HIL)
have plan dirs + code (lib/auth/, /api/auth/, login/register) — v3 direction.

### Blockers/Concerns (verified)

- **BUILD BROKEN:** new untracked `apps/kitchen/src/middleware.ts` (auth, ph63/64)
  collides with `proxy.ts`. This Next.js replaced middleware→proxy; the two files
  hold *different* logic (RBAC vs host-redirect) and must be merged, not deleted.
- **91/545 tests fail** (25 files): SEAL audit-log FK bug, L3 schema mismatch,
  plus mock-setup failures (hive lineage, memory tier routes).
- Golden sets ~4% populated — drift guard / agreement criteria cannot be validated.
- `bcryptjs` declared in package.json but may need `npm install`.
- `.codex/` & `.agents/` untracked tool state — should be gitignored, NOT committed.
- GitNexus embeddings partial (285/473) — upstream crash bug (abhigyanpatwari/GitNexus#824)

### v2.5 Finishing Pass (2026-05-16) — what closed

- ✅ **Golden sets populated** (minimal viable): 57 business-ops 16 rows, 60
  sales/support/finance/ops 15 each. Verified vs real judge — drift agreement
  ≥0.85 with positive + policy-leak negative classes. Reproducible via
  `golden-sets/.generate.mjs`. Full ~50-row sets still a future nice-to-have.
- ✅ **Path/naming ratified** as-built for 61 (`lib/l3`) and 62
  (`/api/public/v1/*`) via plan amendments — rename deferred to external
  packaging. No longer open.
- ✅ **Phase 59 retro-documented** — PLAN + PARTIAL SUMMARY authored; all 6
  MEMGEN reqs implemented + tested.

### Remaining v2.5 gap (1)

- **Dogfood W-lift not capturable — ARCHITECTURAL.** `EvalService.runForTrace`
  (src/lib/evals/service.ts:111) clones the baseline run instead of re-scoring
  the post-apply artifact, so SEAL/agent/memory proposals can never show real
  W improvement in production (only mocked tests show it). Fix: make
  `runForTrace` re-evaluate via `scoreTraceWithEvalEngine`. Blocks success
  criteria 58-#? / 60-#5. **DECISION NEEDED: implement now (net-new) vs accept
  as documented v2.5→v3 carry-over.**
- Phase 59 scope classification (v2.5 vs v3) still open
- Auth/63/64 code kept on main (build depends on it); tracked as v3 in ROADMAP

## Session Continuity

Last session: 2026-05-16 — resume-work reconciliation audit
Stopped at: STATE.md corrected; awaiting user decision on commit strategy
Resume file: None
Next action: user picks fix-then-commit vs park-as-WIP; then execute that path
