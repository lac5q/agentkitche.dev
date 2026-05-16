/**
 * @memoroos/eval-sdk — Standalone publishable types.
 *
 * These are copied (not imported) from apps/kitchen/src/lib/evals/types.ts
 * so that the SDK has no monorepo workspace dependency and can be published
 * independently to npm.
 *
 * If the internal AgentEvalTrace type changes, update this file to match.
 */

// ──────────────────────────────────────────────────────────────────────────────
// Mirrored from apps/kitchen/src/lib/evals/types.ts
// ──────────────────────────────────────────────────────────────────────────────

export type EvalLayer = "l1" | "l2" | "l3";

export interface AgentEvalTrace {
  traceId: string;
  agentId: string;
  agentModelProvider?: string;
  agentModel?: string;
  agentModelFamily?: string;
  role?: string;
  input: string;
  output: string;
  expectedFacts?: string[];
  toolCalls?: Array<{ name: string; valid?: boolean; schemaValid?: boolean }>;
  memory?: {
    expectedFacts?: string[];
    retrievedFacts?: string[];
    recallAtK?: number;
    precisionAtK?: number;
    mrr?: number;
  };
  outcome?: {
    completed?: boolean;
    escalated?: boolean;
    ttrMs?: number;
    operatorApproved?: boolean;
    costUsd?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface EvalLayerBreakdown {
  score: number;
  weight: number;
  scorers: Array<{
    scorerId: string;
    layer: EvalLayer;
    score: number;
    detail: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface EvalRunResult {
  id: string;
  traceId: string;
  agentId: string;
  role: string;
  compositeW: number;
  trusted: boolean;
  layers: Record<EvalLayer, EvalLayerBreakdown>;
  scorerResults: Array<{
    scorerId: string;
    layer: EvalLayer;
    score: number;
    detail: string;
    metadata?: Record<string, unknown>;
  }>;
  judge: {
    score: number;
    rubricScores: { faithful: number; useful: number; policy: number };
    model: string;
    provider: string;
    modelFamily: string;
    promptTemplateVersion: string;
    promptHash: string;
    positionBiasMitigation: { swapAugmentation: boolean; orderAgreement: boolean };
  };
  driftGuard: {
    status: "passed" | "halted";
    agreement: number;
    floor: number;
    goldenSetVersion: string;
    examples: Array<{
      id: string;
      humanScore: number;
      judgeScore: number;
      agreed: boolean;
    }>;
  };
  configHash: string;
  goldenSetPath: string;
  startedAt: string;
  completedAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// SDK-specific types
// ──────────────────────────────────────────────────────────────────────────────

/** Response shape returned by POST /api/public/v1/traces */
export interface EvalSubmitResult {
  runId: string;
  w: number;
  layers: Record<EvalLayer, EvalLayerBreakdown>;
  proposalIds: string[];
  tenantId: string;
}

/** A SEAL proposal summary returned by GET /api/public/v1/proposals */
export interface SealProposal {
  id: string;
  proposalType: string;
  status: string;
  forecastWDelta: number;
  createdAt: string;
}

/** Optional filter for listProposals */
export interface ProposalFilter {
  traceId?: string;
}

/**
 * OpenInference flat attribute bag (openinference-semantic-conventions v0.1.x).
 * Pass this directly to submitTrace() — the server detects the format.
 */
export interface OpenInferenceTrace {
  "openinference.span.kind": string;
  "input.value"?: string;
  "output.value"?: string;
  "llm.model_name"?: string;
  "session.id"?: string;
  "trace.id"?: string;
  "metadata.agent_id"?: string;
  "llm.token_count.total"?: number;
  [key: string]: unknown;
}
