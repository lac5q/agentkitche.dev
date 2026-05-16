/**
 * @memoroos/eval-sdk
 *
 * Public Eval API client for MemroOS.
 *
 * @example
 * ```typescript
 * import { MemroosClient } from "@memoroos/eval-sdk";
 *
 * const client = new MemroosClient({
 *   baseUrl: "https://your-memroos-instance.com",
 *   apiKey: process.env.MEMROOS_API_KEY!,
 * });
 *
 * const result = await client.submitTrace({
 *   traceId: "trace-001",
 *   agentId: "my-agent",
 *   input: "Summarize quarterly report",
 *   output: "Q3 revenue grew 12% YoY...",
 * });
 * console.log("W score:", result.w);
 * ```
 */

export { MemroosClient, MemroosApiError } from "./client";
export type {
  MemroosClientOptions,
} from "./client";
export type {
  AgentEvalTrace,
  EvalLayer,
  EvalLayerBreakdown,
  EvalRunResult,
  EvalSubmitResult,
  SealProposal,
  ProposalFilter,
  OpenInferenceTrace,
} from "./types";
