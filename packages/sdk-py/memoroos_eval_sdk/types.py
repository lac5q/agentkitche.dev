"""
memoroos-eval-sdk — TypedDict definitions for the MemroOS Public Eval API.

Mirrors apps/kitchen/src/lib/evals/types.ts (AgentEvalTrace, EvalRunResult)
and the SDK-specific response types.
"""

from __future__ import annotations

from typing import Any, Optional
from typing_extensions import TypedDict, NotRequired


# ── Mirrored from apps/kitchen/src/lib/evals/types.ts ────────────────────────


class ToolCall(TypedDict):
    name: str
    valid: NotRequired[bool]
    schemaValid: NotRequired[bool]


class MemoryContext(TypedDict):
    expectedFacts: NotRequired[list[str]]
    retrievedFacts: NotRequired[list[str]]
    recallAtK: NotRequired[float]
    precisionAtK: NotRequired[float]
    mrr: NotRequired[float]


class OutcomeContext(TypedDict):
    completed: NotRequired[bool]
    escalated: NotRequired[bool]
    ttrMs: NotRequired[int]
    operatorApproved: NotRequired[bool]
    costUsd: NotRequired[float]


class AgentEvalTrace(TypedDict):
    traceId: str
    agentId: str
    input: str
    output: str
    agentModelProvider: NotRequired[str]
    agentModel: NotRequired[str]
    agentModelFamily: NotRequired[str]
    role: NotRequired[str]
    expectedFacts: NotRequired[list[str]]
    toolCalls: NotRequired[list[ToolCall]]
    memory: NotRequired[MemoryContext]
    outcome: NotRequired[OutcomeContext]
    metadata: NotRequired[dict[str, Any]]


class EvalScorerResult(TypedDict):
    scorerId: str
    layer: str
    score: float
    detail: str
    metadata: NotRequired[dict[str, Any]]


class EvalLayerBreakdown(TypedDict):
    score: float
    weight: float
    scorers: list[EvalScorerResult]


class JudgeResult(TypedDict):
    score: float
    rubricScores: dict[str, float]
    model: str
    provider: str
    modelFamily: str
    promptTemplateVersion: str
    promptHash: str
    positionBiasMitigation: dict[str, bool]


class DriftGuardResult(TypedDict):
    status: str
    agreement: float
    floor: float
    goldenSetVersion: str
    examples: list[dict[str, Any]]


class EvalRunResult(TypedDict):
    id: str
    traceId: str
    agentId: str
    role: str
    compositeW: float
    trusted: bool
    layers: dict[str, EvalLayerBreakdown]
    scorerResults: list[EvalScorerResult]
    judge: JudgeResult
    driftGuard: DriftGuardResult
    configHash: str
    goldenSetPath: str
    startedAt: str
    completedAt: str


# ── SDK-specific types ────────────────────────────────────────────────────────


class EvalSubmitResult(TypedDict):
    """Response from POST /api/public/v1/traces"""
    runId: str
    w: float
    layers: dict[str, EvalLayerBreakdown]
    proposalIds: list[str]
    tenantId: str


class SealProposal(TypedDict):
    id: str
    proposalType: str
    status: str
    forecastWDelta: float
    createdAt: str


class ProposalFilter(TypedDict, total=False):
    traceId: Optional[str]
