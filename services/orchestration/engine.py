"""Phase 36 orchestration engine.

The engine keeps LangGraph's decision boundary explicit while Memroos/A2A remain
responsible for actually transporting work to agents.
"""

from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from typing import Any

BOUNDARY = "LangGraph chooses policy; Memroos/A2A owns transport"
ACTIVE_STATUSES = {"active", "busy"}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def camelize_hil(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "runId": row["run_id"],
        "correlationId": row["correlation_id"],
        "taskSummary": row["task_summary"],
        "selectedAgentId": row["selected_agent_id"],
        "status": row["status"],
        "requestedBy": row["requested_by"],
        "resolvedBy": row["resolved_by"],
        "decision": row["decision"],
        "createdAt": row["created_at"],
        "resolvedAt": row["resolved_at"],
    }


class OrchestrationStore:
    def __init__(self, db_path: str):
        self.db_path = db_path
        parent = os.path.dirname(db_path)
        if parent:
            os.makedirs(parent, exist_ok=True)
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self._init_schema()

    def close(self) -> None:
        self.conn.close()

    def _init_schema(self) -> None:
        self.conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS orchestration_runs (
              run_id TEXT PRIMARY KEY,
              correlation_id TEXT NOT NULL,
              task_summary TEXT NOT NULL,
              required_capability TEXT,
              selected_agent_id TEXT,
              status TEXT NOT NULL,
              retry_limit INTEGER NOT NULL,
              attempts INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL,
              updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS orchestration_lineage (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              correlation_id TEXT NOT NULL,
              run_id TEXT NOT NULL,
              hop_type TEXT NOT NULL,
              agent_id TEXT,
              detail_json TEXT NOT NULL DEFAULT '{}',
              created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS orchestration_hil_decisions (
              id TEXT PRIMARY KEY,
              run_id TEXT NOT NULL,
              correlation_id TEXT NOT NULL,
              task_summary TEXT NOT NULL,
              selected_agent_id TEXT,
              status TEXT NOT NULL,
              requested_by TEXT,
              resolved_by TEXT,
              decision TEXT,
              created_at TEXT NOT NULL,
              resolved_at TEXT
            );
            """
        )
        self.conn.commit()

    def create_run(
        self,
        *,
        run_id: str,
        correlation_id: str,
        task_summary: str,
        required_capability: str | None,
        selected_agent_id: str | None,
        status: str,
        retry_limit: int,
    ) -> None:
        timestamp = now_iso()
        self.conn.execute(
            """
            INSERT INTO orchestration_runs (
              run_id, correlation_id, task_summary, required_capability,
              selected_agent_id, status, retry_limit, attempts, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            """,
            (
                run_id,
                correlation_id,
                task_summary,
                required_capability,
                selected_agent_id,
                status,
                retry_limit,
                timestamp,
                timestamp,
            ),
        )
        self.conn.commit()

    def update_run(self, run_id: str, *, status: str, selected_agent_id: str | None = None) -> None:
        self.conn.execute(
            """
            UPDATE orchestration_runs
            SET status = ?, selected_agent_id = COALESCE(?, selected_agent_id), updated_at = ?
            WHERE run_id = ?
            """,
            (status, selected_agent_id, now_iso(), run_id),
        )
        self.conn.commit()

    def increment_attempts(self, run_id: str, *, status: str) -> dict[str, Any]:
        self.conn.execute(
            """
            UPDATE orchestration_runs
            SET attempts = attempts + 1, status = ?, updated_at = ?
            WHERE run_id = ?
            """,
            (status, now_iso(), run_id),
        )
        self.conn.commit()
        run = self.get_run(run_id)
        if run is None:
            raise KeyError(f"Unknown orchestration run: {run_id}")
        return run

    def get_run(self, run_id: str) -> dict[str, Any] | None:
        row = self.conn.execute(
            "SELECT * FROM orchestration_runs WHERE run_id = ?",
            (run_id,),
        ).fetchone()
        return dict(row) if row else None

    def append_lineage(
        self,
        *,
        correlation_id: str,
        run_id: str,
        hop_type: str,
        agent_id: str | None = None,
        detail: dict[str, Any] | None = None,
    ) -> None:
        self.conn.execute(
            """
            INSERT INTO orchestration_lineage (
              correlation_id, run_id, hop_type, agent_id, detail_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                correlation_id,
                run_id,
                hop_type,
                agent_id,
                json.dumps(detail or {}, sort_keys=True),
                now_iso(),
            ),
        )
        self.conn.commit()

    def list_lineage(self, correlation_id: str) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            """
            SELECT * FROM orchestration_lineage
            WHERE correlation_id = ?
            ORDER BY id ASC
            """,
            (correlation_id,),
        ).fetchall()
        return [dict(row) for row in rows]

    def create_hil_decision(
        self,
        *,
        run_id: str,
        correlation_id: str,
        task_summary: str,
        selected_agent_id: str | None,
        requested_by: str | None,
    ) -> str:
        decision_id = f"hil_{uuid.uuid4().hex}"
        self.conn.execute(
            """
            INSERT INTO orchestration_hil_decisions (
              id, run_id, correlation_id, task_summary, selected_agent_id, status,
              requested_by, resolved_by, decision, created_at, resolved_at
            ) VALUES (?, ?, ?, ?, ?, 'pending', ?, NULL, NULL, ?, NULL)
            """,
            (decision_id, run_id, correlation_id, task_summary, selected_agent_id, requested_by, now_iso()),
        )
        self.conn.commit()
        return decision_id

    def list_pending_hil(self) -> list[dict[str, Any]]:
        rows = self.conn.execute(
            """
            SELECT * FROM orchestration_hil_decisions
            WHERE status = 'pending'
            ORDER BY created_at ASC
            """
        ).fetchall()
        return [camelize_hil(row) for row in rows]

    def resolve_hil_decision(self, decision_id: str, *, decision: str, actor: str | None) -> dict[str, Any]:
        row = self.conn.execute(
            "SELECT * FROM orchestration_hil_decisions WHERE id = ?",
            (decision_id,),
        ).fetchone()
        if row is None:
            raise KeyError(f"Unknown HIL decision: {decision_id}")

        status = "approved" if decision == "approve" else "rejected"
        self.conn.execute(
            """
            UPDATE orchestration_hil_decisions
            SET status = ?, decision = ?, resolved_by = ?, resolved_at = ?
            WHERE id = ?
            """,
            (status, decision, actor, now_iso(), decision_id),
        )
        self.conn.commit()
        updated = self.conn.execute(
            "SELECT * FROM orchestration_hil_decisions WHERE id = ?",
            (decision_id,),
        ).fetchone()
        return camelize_hil(updated)


class OrchestrationEngine:
    def __init__(self, store: OrchestrationStore, retry_limit: int = 2, graph_runtime: Any | None = None):
        self.store = store
        self.retry_limit = retry_limit
        self.graph_runtime = graph_runtime

    def route_task(self, payload: dict[str, Any]) -> dict[str, Any]:
        task_summary = str(payload.get("taskSummary") or "").strip()
        if not task_summary:
            raise ValueError("taskSummary is required")

        correlation_id = str(payload.get("correlationId") or f"corr_{uuid.uuid4().hex}")
        run_id = str(payload.get("runId") or f"run_{uuid.uuid4().hex}")
        required_capability = payload.get("requiredCapability")
        if required_capability is not None:
            required_capability = str(required_capability)
        agents = payload.get("agents") if isinstance(payload.get("agents"), list) else []
        selected_agent = self._select_agent(agents, required_capability)
        selected_agent_id = selected_agent.get("id") if selected_agent else None

        self.store.create_run(
            run_id=run_id,
            correlation_id=correlation_id,
            task_summary=task_summary,
            required_capability=required_capability,
            selected_agent_id=selected_agent_id,
            status="routing",
            retry_limit=self.retry_limit,
        )
        self.store.append_lineage(
            correlation_id=correlation_id,
            run_id=run_id,
            hop_type="ingress",
            detail={"taskSummary": task_summary, "requiredCapability": required_capability},
        )

        if payload.get("requiresApproval") or selected_agent is None:
            graph_state = self._start_graph(
                run_id=run_id,
                task_summary=task_summary,
                required_capability=required_capability,
                selected_agent_id=selected_agent_id,
                requires_approval=True,
            )
            decision_id = self.store.create_hil_decision(
                run_id=run_id,
                correlation_id=correlation_id,
                task_summary=task_summary,
                selected_agent_id=selected_agent_id,
                requested_by=str(payload.get("requestedBy") or "operator"),
            )
            self.store.update_run(run_id, status="waiting_for_approval")
            self.store.append_lineage(
                correlation_id=correlation_id,
                run_id=run_id,
                hop_type="hil_wait",
                agent_id=selected_agent_id,
            )
            return self._result(
                run_id=run_id,
                correlation_id=correlation_id,
                status=graph_state.get("status", "waiting_for_approval"),
                selected_agent_id=selected_agent_id,
                hil_decision_id=decision_id,
                graph_state=graph_state,
            )

        graph_state = self._start_graph(
            run_id=run_id,
            task_summary=task_summary,
            required_capability=required_capability,
            selected_agent_id=selected_agent_id,
            requires_approval=False,
        )
        self.store.update_run(run_id, status="dispatched", selected_agent_id=selected_agent_id)
        self.store.append_lineage(
            correlation_id=correlation_id,
            run_id=run_id,
            hop_type="route",
            agent_id=selected_agent_id,
            detail={"reason": "capability_match"},
        )
        self.store.append_lineage(
            correlation_id=correlation_id,
            run_id=run_id,
            hop_type="dispatch_request",
            agent_id=selected_agent_id,
            detail={"protocol": selected_agent.get("protocol")},
        )
        return self._result(
            run_id=run_id,
            correlation_id=correlation_id,
            status=graph_state.get("status", "dispatched"),
            selected_agent_id=selected_agent_id,
            graph_state=graph_state,
        )

    def resolve_hil(self, decision_id: str, decision: str, actor: str | None = None) -> dict[str, Any]:
        if decision not in {"approve", "reject"}:
            raise ValueError("decision must be approve or reject")

        resolved = self.store.resolve_hil_decision(decision_id, decision=decision, actor=actor)
        resumed = decision == "approve"
        run_status = "dispatched" if resumed else "rejected"
        self.store.update_run(resolved["runId"], status=run_status)
        self.store.append_lineage(
            correlation_id=resolved["correlationId"],
            run_id=resolved["runId"],
            hop_type="hil_approved" if resumed else "hil_rejected",
            agent_id=resolved["selectedAgentId"],
            detail={"actor": actor},
        )
        graph_state = None
        if self.graph_runtime:
            graph_state = self.graph_runtime.resume(resolved["runId"], decision)
        return {"ok": True, **resolved, "status": resolved["status"], "resumed": resumed, "graphState": graph_state}

    def record_task_failure(self, run_id: str, error: str | None = None) -> dict[str, Any]:
        run = self.store.get_run(run_id)
        if run is None:
            raise KeyError(f"Unknown orchestration run: {run_id}")

        attempts_after_failure = int(run["attempts"]) + 1
        terminal = attempts_after_failure >= self.retry_limit
        status = "waiting_for_approval" if terminal else "retrying"
        updated = self.store.increment_attempts(run_id, status=status)
        self.store.append_lineage(
            correlation_id=run["correlation_id"],
            run_id=run_id,
            hop_type="dispatch_failure",
            agent_id=run["selected_agent_id"],
            detail={"error": error, "attempts": updated["attempts"]},
        )

        if not terminal:
            self.store.append_lineage(
                correlation_id=run["correlation_id"],
                run_id=run_id,
                hop_type="retry_scheduled",
                agent_id=run["selected_agent_id"],
                detail={"remainingRetries": self.retry_limit - int(updated["attempts"])},
            )
            return {
                "ok": True,
                "runId": run_id,
                "correlationId": run["correlation_id"],
                "status": "retrying",
                "attempts": int(updated["attempts"]),
                "remainingRetries": self.retry_limit - int(updated["attempts"]),
            }

        decision_id = self.store.create_hil_decision(
            run_id=run_id,
            correlation_id=run["correlation_id"],
            task_summary=f"Retry limit reached: {run['task_summary']}",
            selected_agent_id=run["selected_agent_id"],
            requested_by="orchestration-retry-policy",
        )
        self.store.append_lineage(
            correlation_id=run["correlation_id"],
            run_id=run_id,
            hop_type="retry_exhausted",
            agent_id=run["selected_agent_id"],
            detail={"hilDecisionId": decision_id},
        )
        return {
            "ok": True,
            "runId": run_id,
            "correlationId": run["correlation_id"],
            "status": "waiting_for_approval",
            "attempts": int(updated["attempts"]),
            "remainingRetries": 0,
            "hilDecisionId": decision_id,
        }

    def _result(
        self,
        *,
        run_id: str,
        correlation_id: str,
        status: str,
        selected_agent_id: str | None,
        hil_decision_id: str | None = None,
        graph_state: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return {
            "ok": True,
            "runId": run_id,
            "correlationId": correlation_id,
            "status": status,
            "selectedAgentId": selected_agent_id,
            "hilDecisionId": hil_decision_id,
            "retryLimit": self.retry_limit,
            "boundary": BOUNDARY,
            "graphState": graph_state,
        }

    def _start_graph(
        self,
        *,
        run_id: str,
        task_summary: str,
        required_capability: str | None,
        selected_agent_id: str | None,
        requires_approval: bool,
    ) -> dict[str, Any]:
        if not self.graph_runtime:
            return {"status": "waiting_for_approval" if requires_approval else "dispatched"}
        return self.graph_runtime.start(
            {
                "runId": run_id,
                "taskSummary": task_summary,
                "requiredCapability": required_capability,
                "selectedAgentId": selected_agent_id,
                "requiresApproval": requires_approval,
            }
        )

    def _select_agent(self, agents: list[Any], required_capability: str | None) -> dict[str, Any] | None:
        candidates = [agent for agent in agents if isinstance(agent, dict)]
        if required_capability:
            candidates = [agent for agent in candidates if self._agent_matches(agent, required_capability)]
        if not candidates:
            return None

        def sort_key(agent: dict[str, Any]) -> tuple[int, str, str]:
            status = str(agent.get("status") or "").lower()
            active_rank = 0 if status in ACTIVE_STATUSES else 1
            return (active_rank, str(agent.get("name") or "").lower(), str(agent.get("id") or "").lower())

        return sorted(candidates, key=sort_key)[0]

    def _agent_matches(self, agent: dict[str, Any], required_capability: str) -> bool:
        needle = required_capability.lower()
        for capability in agent.get("capabilities") or []:
            if not isinstance(capability, dict):
                continue
            values = [capability.get("id"), capability.get("name"), capability.get("description")]
            values.extend(capability.get("tags") or [])
            if any(needle == str(value).lower() for value in values if value is not None):
                return True
        return needle in str(agent.get("role") or "").lower()
