import { SealService } from "./service";
import type { ProposalDraft, SealProposal } from "./types";

export async function reflectOnTrace(traceId: string, runId: string): Promise<SealProposal[]> {
  return new SealService().reflectOnTrace(traceId, runId);
}

export async function reflectOnTraceWithService(
  service: SealService,
  traceId: string,
  runId: string
): Promise<SealProposal[]> {
  return service.reflectOnTrace(traceId, runId);
}

export function buildProposalDraftsForRun(service: SealService, traceId: string, runId: string): ProposalDraft[] {
  return service.buildProposalDrafts(traceId, runId);
}
