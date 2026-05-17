/**
 * Phase 62: OpenInference → AgentEvalTrace mapper.
 *
 * Pinned to openinference-semantic-conventions v0.1.x attribute names
 * (see https://github.com/Arize-ai/openinference/tree/main/spec v0.1.x).
 *
 * Attribute mapping table (Decision 3 in 62-CONTEXT.md):
 *   openinference.span.kind           → format detection
 *   input.value                       → trace.input
 *   output.value                      → trace.output
 *   llm.model_name                    → trace.agentModel
 *   session.id | trace.id             → trace.traceId
 *   metadata.agent_id (custom)        → trace.agentId
 *   llm.token_count.total (heuristic) → trace.outcome.costUsd (estimated at $0.000002 / token)
 *
 * Unmapped attributes are collected into trace.metadata.openInferenceAttributes.
 */

import type { AgentEvalTrace } from "./types";

/**
 * Flat attribute bag from openinference-semantic-conventions v0.1.x.
 * Only the fields used by the mapper are declared; all others are captured
 * under an index signature and forwarded into metadata.
 *
 * @version openinference-semantic-conventions v0.1.x
 */
export interface OpenInferenceSpan {
  /** Required: span kind. Accepted values: "AGENT", "LLM", "CHAIN", "TOOL". */
  "openinference.span.kind": string;
  /** Raw input text (MemroOS: trace.input). */
  "input.value"?: string;
  /** Raw output text (MemroOS: trace.output). */
  "output.value"?: string;
  /** LLM model name (MemroOS: trace.agentModel). */
  "llm.model_name"?: string;
  /** Session identifier (MemroOS: trace.traceId). */
  "session.id"?: string;
  /** Trace identifier (fallback for trace.traceId when session.id is absent). */
  "trace.id"?: string;
  /** Custom attribute: the agent identifier (MemroOS: trace.agentId). */
  "metadata.agent_id"?: string;
  /** Total token count — used for cost estimation. */
  "llm.token_count.total"?: number;
  /** All other attributes are passed through to metadata. */
  [key: string]: unknown;
}

const KNOWN_KEYS = new Set<string>([
  "openinference.span.kind",
  "input.value",
  "output.value",
  "llm.model_name",
  "session.id",
  "trace.id",
  "metadata.agent_id",
  "llm.token_count.total",
]);

/** Returns true when the payload is an OpenInference span (has `openinference.span.kind`). */
export function isOpenInferenceTrace(payload: unknown): payload is OpenInferenceSpan {
  if (!payload || typeof payload !== "object") return false;
  return "openinference.span.kind" in (payload as Record<string, unknown>);
}

/**
 * Maps an OpenInference span to an AgentEvalTrace.
 * Produces the same AgentEvalTrace as the MemroOS-JSON path for traces
 * carrying equivalent data (round-trip requirement API-02).
 */
export function mapOpenInferenceToAgentEvalTrace(span: OpenInferenceSpan): AgentEvalTrace {
  const traceId =
    span["session.id"] ??
    span["trace.id"] ??
    `oi-${Math.random().toString(36).slice(2)}`;

  const agentId = span["metadata.agent_id"] ?? "unknown";

  const input = span["input.value"] ?? "";
  const output = span["output.value"] ?? "";

  const agentModel = span["llm.model_name"];

  // Cost heuristic: $0.000002 per token (conservative GPT-4-class estimate).
  const tokenTotal = span["llm.token_count.total"];
  const costUsd =
    typeof tokenTotal === "number" ? tokenTotal * 0.000002 : undefined;

  // Collect unmapped attributes into metadata.
  const extraAttributes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(span)) {
    if (!KNOWN_KEYS.has(key)) {
      extraAttributes[key] = value;
    }
  }

  const trace: AgentEvalTrace = {
    traceId,
    agentId,
    input,
    output,
    ...(agentModel ? { agentModel } : {}),
    ...(costUsd !== undefined
      ? { outcome: { costUsd } }
      : {}),
    metadata: {
      openInferenceSpanKind: span["openinference.span.kind"],
      ...(Object.keys(extraAttributes).length > 0
        ? { openInferenceAttributes: extraAttributes }
        : {}),
    },
  };

  return trace;
}
