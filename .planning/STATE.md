---
gsd_state_version: 1.0
milestone: v4.0
milestone_name: Orchestration Depth + Intelligence Uplift
status: planning
last_updated: "2026-05-17T17:00:00.000Z"
last_activity: 2026-05-17
progress:
  total_phases: 3
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# State: Memroos

## Project Reference

See: .planning/PROJECT.md (updated 2026-05-04 for v2.0)

**Core value:** Any agent framework plugs into Memroos — and every agent, knowledge system, and skill becomes visible, connected, and self-improving.
**Current focus:** Phase 70 — Foundation + Engine Core

## Current Position

Phase: 70 — Foundation + Engine Core (not started)
Plan: —
Status: Roadmap created — ready for /gsd:plan-phase 70
Last activity: 2026-05-17 — v4.0 roadmap created (Phases 70-72)

## Roadmap Summary (v4.0)

| Phase | Goal | Requirements |
|-------|------|--------------|
| 70 | Foundation + Engine Core — HIL edit-and-continue, multi-hop retry/rollback, memory adapter interface (incl. WAL pragma fix) | HIL-01..03, ORCH-08..10, MEM-06..08 (9) |
| 71 | Recall + HIL SLA + Voice — LLM semantic recall, SLA escalation timers, Daily.co meeting bot | RECALL-01..02, HIL-04..06, VOICE-06..08 (8) |
| 72 | Cross-Project Recall + Behavioral W-lift + UI + Skills | RECALL-03..04, SEAL-04..06, UI-05..06, SKILL-01..04 (11) |

**Coverage:** 28/28 v4.0 requirements mapped, no orphans.
**Completed so far:** Phase 34 through Phase 69 (v2.0–v3.1 shipped).

## Performance Metrics

**Velocity:**

- Total v2.0-v2.4 plans completed: 29
- Phase 35 execution completed: 2026-05-05
- Phase 36 completed: 2026-05-05
- Latest Phase 40 gate: docs link/content review, markdown grep checks, Memroos lint, and build passed

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
- **LangGraph checkpoint DB is `data/orchestration.db`** — SEPARATE from Memroos's main SQLite DB to avoid cross-process lock contention
- **A2A adapter and LangGraph are separate layers** — A2A owns transport/protocol/task-state mapping; LangGraph owns routing policy, capability selection, retry, HIL. They communicate via internal API (ORCH-07 contract)
- **REG-00 canonical registry is complete** — A2A and REST registration both write through the same model
- **Phase 35 A2A layer is complete** — agent cards, A2A registration, durable task APIs, SSE, outbound delegation, ADK fixture, Registry/Flow surfacing
- **A2A adapter routing is protocol-driven** — `protocol: a2a` selects A2A; platform alone does not reroute legacy Gemini agents
- **Outbound A2A credentials are env-key-only** — metadata may name an env var, but UI must not render bearer/API-key values or raw auth headers
- **ADK proof fixture is optional** — `examples/adk-a2a-agent/` is not imported by Memroos startup

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

- **BUILD BROKEN:** new untracked `apps/memroos/src/middleware.ts` (auth, ph63/64)
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

### v2.5 Tier 1 closure (2026-05-16)

- ✅ **Dogfood W-lift closed at Tier 1:** `EvalService.rescoreForProposal`
  now uses `lib/seal/rescore.ts` to run deterministic modeled post-apply
  re-scoring through the real eval engine, golden-set loader, layer scorers,
  judge, drift guard, persistence, and SEAL audit metadata. Keep and rollback
  are both reachable without a mocked eval service.

- ✅ **Honesty guardrail preserved:** memory/config proposal classes can move W
  via the modeled fixed-harness delta. `agent_instruction_patch`,
  `skill_addition`, and `noop_test` keep W unchanged with `wLiftModeled:false`.
  True behavioral W-lift from instruction/skill changes remains v3.

- Phase 59 scope classification closed as v2.5 retro-documented; behavioral
  instruction/skill W-lift remains v3 scope

- Auth/63/64 code kept on main (build depends on it); tracked as v3 in ROADMAP

## Session Continuity

Last session: 2026-05-17T09:30:00.000Z
Stopped at: all phases complete; 8 critical security findings fixed; 680 tests passing; deployed to Vercel
Resume file: None
Next action: v4.0 milestone planning

## UAT Findings (2026-05-17)

- **Root cause fixed:** `apps/memroos/.env.local` was missing `MEMROOS_JWT_SECRET`, `MEMROOS_ADMIN_EMAIL`, `MEMROOS_ADMIN_PASSWORD`. These live in root `.env` which Next.js doesn't load. Added to `.env.local` (gitignored).
- **Tenant API key mismatch:** `tak-default-internal` hash was stale. Updated to match current `MEMROOS_OPERATOR_API_KEY` in `.env.local`.
- **All 18 pages 200 OK**, 680 tests passing, eval engine E2E verified (W=0.7035), public API functional.

## Deferred Items

Items acknowledged and deferred at milestone close on 2026-05-17:

| Category | Item | Status |
|----------|------|--------|
| context_questions | Phase 60 / 60-CONTEXT.md — trajectory authorship workflow, step count bounds, preset-change audit semantics | Deferred to v3 planning |
| context_questions | Phase 63 / 63-CONTEXT.md — rename/auth decisions recorded as next-milestone context | Deferred to Phase 63 execution |
