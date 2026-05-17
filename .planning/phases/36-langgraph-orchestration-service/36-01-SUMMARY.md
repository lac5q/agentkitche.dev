---
phase: 36-langgraph-orchestration-service
plan: 01
subsystem: orchestration
status: complete-foundation
requirements_addressed: [ORCH-04, ORCH-05, ORCH-06, ORCH-07]
requirements_remaining: [ORCH-01, ORCH-02, ORCH-03]
---

# Phase 36 Plan 01 Summary: Orchestration Foundation + HIL Surface

## What Landed

- Added a separate Python orchestration service scaffold under `services/orchestration/`.
- Added a deterministic `OrchestrationEngine` with SQLite-backed runs, lineage, HIL decisions, and retry exhaustion behavior.
- Added FastAPI facade routes:
  - `POST /tasks/route`
  - `GET /hil`
  - `POST /hil/{decision_id}/resolve`
  - `POST /tasks/{run_id}/failures`
  - `GET /health`
- Added Memroos proxy routes:
  - `POST /api/orchestration`
  - `GET /api/orchestration/hil`
  - `POST /api/orchestration/hil/[id]`
- Added Flow-page HIL approval panel with approve/reject actions and an authorization-error state.
- Added env seams for the orchestration service in `.env.example`.
- Added tests for routing, lineage, retry exhaustion, HIL approve/reject, proxy auth, canonical registry agent forwarding, and UI approval submission.

## Choices Made And Why

- **Separate Python service:** Preserves the Phase 36 architecture and avoids running LangGraph inside the Next.js process.
- **Dedicated SQLite DB path:** Defaults to `data/orchestration.db`, separate from Memroos's main SQLite DB to avoid cross-process lock contention.
- **Deterministic routing first:** Active agents with matching declared capability win, then stable name/id sorting. This is debuggable and easy to replace with richer policy once the LangGraph graph is fully wired.
- **Memroos remains control plane:** Memroos proxies orchestration requests, provides canonical registry agents, enforces operator authorization, and renders HIL. It does not own routing policy.
- **A2A boundary preserved:** The orchestration result records `LangGraph chooses policy; Memroos/A2A owns transport`, keeping Phase 35 transport separate from Phase 36 policy.
- **Retry limit default is 2:** Small enough for fast operator feedback, configurable through `ORCHESTRATION_RETRY_LIMIT`.
- **Secure HIL listing:** HIL decisions can include sensitive task summaries, so list and resolve routes both require the existing operator authorization gate.
- **Python 3.9-compatible FastAPI models:** Pydantic on Python 3.9 failed on `str | None`, so service DTOs use `Optional[...]`.

## Code Review Findings Addressed

- HIL listing was initially unauthenticated; fixed by requiring operator authorization and adding a regression test.
- FastAPI service initially only supported direct `app:app` imports and used Pydantic annotations that failed under Python 3.9; fixed with package/direct import fallback and `Optional[...]` annotations, verified by package-import smoke test.

## Verification

- `python3 -m unittest discover services/orchestration/tests` — passed, 4 tests.
- `python3 -m py_compile services/orchestration/engine.py services/orchestration/app.py services/orchestration/graph.py` — passed.
- Python package import smoke: `importlib.import_module('services.orchestration.app')` — passed.
- `npm --prefix apps/memroos run test -- src/app/api/orchestration/__tests__/route.test.ts src/components/orchestration/__tests__/hil-panel.test.tsx` — passed, 5 tests.
- `npm --prefix apps/memroos run lint` — passed with 12 pre-existing warnings.
- `npm --prefix apps/memroos run build` — passed with the known pre-existing Turbopack NFT warning involving `/api/apo`.

## Remaining Phase 36 Work

- Wire the actual LangGraph `StateGraph` route into the service runtime instead of keeping it as a seam module.
- Add `SqliteSaver` checkpoint persistence once the Python service environment installs LangGraph dependencies.
- Prove graph pause/resume from checkpoint for HIL, not just service-level HIL state transitions.
- Add an end-to-end dispatch handoff from orchestration result into the Phase 35 A2A adapter/task layer.
