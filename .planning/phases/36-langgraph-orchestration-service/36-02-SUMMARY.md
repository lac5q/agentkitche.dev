---
phase: 36-langgraph-orchestration-service
plan: 02
subsystem: orchestration
status: complete
requirements_addressed: [ORCH-01, ORCH-02, ORCH-03]
---

# Phase 36 Plan 02 Summary: LangGraph Checkpoint Runtime

## What Landed

- Replaced the placeholder graph seam with a real LangGraph `StateGraph` runtime.
- Added `LangGraphRuntime.start()` and `LangGraphRuntime.resume()` using `SqliteSaver.from_conn_string(...)` against the dedicated orchestration DB path.
- Wired the FastAPI service engine to run the LangGraph graph for both immediate dispatch and HIL-required tasks.
- Added graph checkpoint tests proving:
  - HIL tasks interrupt and persist checkpoints.
  - Approve resumes from checkpoint to `approved`.
  - Reject resumes from checkpoint to `rejected`.
  - Non-HIL tasks flow through the graph to `dispatched`.
  - `SqliteSaver` creates checkpoint tables in `data/orchestration.db`-style SQLite storage.

## Choices Made And Why

- **Use run ID as LangGraph thread ID:** This keeps checkpoint lookup deterministic and aligns graph state with the persisted orchestration run.
- **Resume on approve and reject:** Reject is a real graph continuation, not only a service status update. This avoids orphaned paused checkpoints.
- **Keep deterministic capability selection in `OrchestrationEngine`:** The graph owns policy state/checkpoint/HIL, while the engine still performs the simple Phase 36 routing rule. Later richer LangGraph routing can move more selection logic into the graph without changing Memroos/A2A transport.
- **Use the same dedicated SQLite file for orchestration metadata and LangGraph checkpoints:** This satisfies the separate-DB requirement while keeping all orchestration-only state together and away from Memroos's main DB.

## Verification

- `python3 -m unittest discover services/orchestration/tests` — passed, 8 tests.
- `python3 -m py_compile services/orchestration/engine.py services/orchestration/app.py services/orchestration/graph.py` — passed.
- `npm --prefix apps/memroos run test -- src/app/api/orchestration/__tests__/route.test.ts src/components/orchestration/__tests__/hil-panel.test.tsx` — passed, 5 tests.

## Residual Notes

- Python 3.9 emits a local `urllib3` LibreSSL warning when importing LangGraph dependencies. This does not fail tests, but Phase 38 Docker/setup should prefer a modern Python/OpenSSL base image.
