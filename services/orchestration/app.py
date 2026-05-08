"""FastAPI facade for the Phase 36 orchestration service."""

from __future__ import annotations

import os
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

try:
    from .engine import OrchestrationEngine, OrchestrationStore
    from .graph import LangGraphRuntime
except ImportError:  # Allows `uvicorn app:app` from services/orchestration.
    from engine import OrchestrationEngine, OrchestrationStore
    from graph import LangGraphRuntime


def get_engine() -> OrchestrationEngine:
    db_path = os.environ.get("ORCHESTRATION_DB_PATH", "data/orchestration.db")
    retry_limit = int(os.environ.get("ORCHESTRATION_RETRY_LIMIT", "2"))
    return OrchestrationEngine(
        OrchestrationStore(db_path),
        retry_limit=retry_limit,
        graph_runtime=LangGraphRuntime(db_path),
    )


app = FastAPI(title="agentkitchen.dev Orchestration", version="0.1.0")


class RouteTaskRequest(BaseModel):
    taskSummary: str = Field(min_length=1)
    requiredCapability: Optional[str] = None
    correlationId: Optional[str] = None
    runId: Optional[str] = None
    requiresApproval: bool = False
    requestedBy: Optional[str] = None
    agents: list[dict[str, Any]] = Field(default_factory=list)


class ResolveHilRequest(BaseModel):
    decision: str
    actor: Optional[str] = None


class TaskFailureRequest(BaseModel):
    error: Optional[str] = None


@app.get("/health")
def health() -> dict[str, str]:
    return {"ok": "true", "service": "orchestration"}


@app.post("/tasks/route")
def route_task(request: RouteTaskRequest) -> dict[str, Any]:
    engine = get_engine()
    try:
        return engine.route_task(request.model_dump())
    finally:
        engine.store.close()


@app.get("/hil")
def list_hil() -> dict[str, Any]:
    engine = get_engine()
    try:
        return {"ok": True, "decisions": engine.store.list_pending_hil()}
    finally:
        engine.store.close()


@app.post("/hil/{decision_id}/resolve")
def resolve_hil(decision_id: str, request: ResolveHilRequest) -> dict[str, Any]:
    engine = get_engine()
    try:
        return engine.resolve_hil(decision_id, request.decision, request.actor)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    finally:
        engine.store.close()


@app.post("/tasks/{run_id}/failures")
def record_task_failure(run_id: str, request: TaskFailureRequest) -> dict[str, Any]:
    engine = get_engine()
    try:
        return engine.record_task_failure(run_id, request.error)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    finally:
        engine.store.close()
