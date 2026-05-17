"""LangGraph runtime for Phase 36 orchestration policy.

A2A/Memroos owns transport. This graph owns policy state, approval pauses,
and checkpoint resume semantics.
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Dict, Iterator, List, Optional, TypedDict

from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, Interrupt, interrupt


class OrchestrationState(TypedDict, total=False):
    runId: str
    taskSummary: str
    requiredCapability: str
    selectedAgentId: Optional[str]
    requiresApproval: bool
    status: str
    approvalDecision: str


def _interrupts_from_result(result: Dict[str, Any]) -> List[Dict[str, Any]]:
    raw_interrupts = result.get("__interrupt__") or []
    interrupts: List[Dict[str, Any]] = []
    for raw in raw_interrupts:
        if isinstance(raw, Interrupt):
            interrupts.append({"id": raw.id, "value": raw.value})
        elif hasattr(raw, "id") and hasattr(raw, "value"):
            interrupts.append({"id": raw.id, "value": raw.value})
        else:
            interrupts.append({"id": None, "value": raw})
    return interrupts


def _public_state(result: Dict[str, Any]) -> Dict[str, Any]:
    interrupts = _interrupts_from_result(result)
    status = "waiting_for_approval" if interrupts else result.get("status", "dispatched")
    return {
        "runId": result.get("runId"),
        "taskSummary": result.get("taskSummary"),
        "requiredCapability": result.get("requiredCapability"),
        "selectedAgentId": result.get("selectedAgentId"),
        "status": status,
        "approvalDecision": result.get("approvalDecision"),
        "interrupts": interrupts,
        "checkpointed": True,
    }


def build_langgraph(checkpointer: SqliteSaver) -> Any:
    def route_policy(state: OrchestrationState) -> OrchestrationState:
        return {**state, "status": "routed"}

    def needs_approval(state: OrchestrationState) -> str:
        return "approval" if state.get("requiresApproval") else "dispatch"

    def approval(state: OrchestrationState) -> OrchestrationState:
        decision = interrupt(
            {
                "kind": "operator_approval",
                "runId": state.get("runId"),
                "taskSummary": state.get("taskSummary"),
                "selectedAgentId": state.get("selectedAgentId"),
            }
        )
        status = "approved" if decision == "approve" else "rejected"
        return {**state, "approvalDecision": decision, "status": status}

    def dispatch(state: OrchestrationState) -> OrchestrationState:
        return {**state, "status": "dispatched"}

    graph = StateGraph(OrchestrationState)
    graph.add_node("route_policy", route_policy)
    graph.add_node("approval", approval)
    graph.add_node("dispatch", dispatch)
    graph.add_edge(START, "route_policy")
    graph.add_conditional_edges(
        "route_policy",
        needs_approval,
        {"approval": "approval", "dispatch": "dispatch"},
    )
    graph.add_edge("approval", END)
    graph.add_edge("dispatch", END)
    return graph.compile(checkpointer=checkpointer)


class LangGraphRuntime:
    def __init__(self, db_path: str):
        self.db_path = db_path

    @contextmanager
    def _compiled(self) -> Iterator[Any]:
        with SqliteSaver.from_conn_string(self.db_path) as checkpointer:
            yield build_langgraph(checkpointer)

    def start(self, state: Dict[str, Any]) -> Dict[str, Any]:
        run_id = str(state["runId"])
        config = {"configurable": {"thread_id": run_id}}
        with self._compiled() as graph:
            result = graph.invoke(state, config=config)
        return _public_state(result)

    def resume(self, run_id: str, decision: str) -> Dict[str, Any]:
        if decision not in {"approve", "reject"}:
            raise ValueError("decision must be approve or reject")
        config = {"configurable": {"thread_id": run_id}}
        with self._compiled() as graph:
            result = graph.invoke(Command(resume=decision), config=config)
        return _public_state(result)
