/**
 * Phase 62 dogfood refactor:
 * In production, SealService receives an SDK-backed EvalServiceLike that routes
 * eval calls through the public HTTP API surface. In development/test, it falls
 * back to direct EvalService (no server required).
 */
import { SealService } from "./service";
import { createEvalServiceForSeal } from "./sdk-eval-service";
import type { ApplyResult } from "./types";

export async function applyProposal(proposalId: string): Promise<ApplyResult> {
  const sdkEvalService = createEvalServiceForSeal();
  return new SealService(
    sdkEvalService ? { evalService: sdkEvalService } : {}
  ).applyProposal(proposalId);
}

export async function applyProposalWithService(service: SealService, proposalId: string): Promise<ApplyResult> {
  return service.applyProposal(proposalId);
}
