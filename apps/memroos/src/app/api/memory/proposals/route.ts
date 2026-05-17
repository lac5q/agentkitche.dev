import type { NextRequest } from "next/server";

import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";
import { SealService } from "@/lib/seal/service";
import type { ProposalStatus } from "@/lib/seal/types";
import { PROPOSAL_TYPES } from "@/lib/seal/proposal-registry";

export const dynamic = "force-dynamic";

const MEMORY_PROPOSAL_TYPES = [
  "memory_rewrite",
  "query_hint",
  "salience_update",
  "tier_route",
  "eval_case_addition",
] as const;

type MemoryProposalType = (typeof MEMORY_PROPOSAL_TYPES)[number];

function isMemoryProposalType(value: string): value is MemoryProposalType {
  return (MEMORY_PROPOSAL_TYPES as readonly string[]).includes(value);
}

const STATUSES: ProposalStatus[] = ["pending", "approved", "rejected", "applied", "rolled_back"];

function statusFrom(value: string | null): ProposalStatus | undefined {
  return value && STATUSES.includes(value as ProposalStatus)
    ? (value as ProposalStatus)
    : undefined;
}

/**
 * GET /api/memory/proposals
 * Lists all memory-specific proposals (filtered by optional status query param).
 *
 * Returns only proposals whose type is one of the five memory proposal types.
 */
export function GET(req: NextRequest) {
  const url = req.nextUrl ?? new URL(req.url);
  const service = new SealService();
  const allProposals = service.listProposals({
    status: statusFrom(url.searchParams.get("status")),
  });
  const memoryProposals = allProposals.filter((p) => isMemoryProposalType(p.proposalType));

  return Response.json({
    proposals: memoryProposals,
    types: Object.fromEntries(
      MEMORY_PROPOSAL_TYPES.map((t) => [
        t,
        { label: PROPOSAL_TYPES[t].label, description: PROPOSAL_TYPES[t].description },
      ])
    ),
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/memory/proposals
 * Triggers reflection on a memory trace and generates typed memory proposals.
 *
 * Body: { traceId: string; runId: string; proposalTypes?: string[] }
 *
 * proposalTypes defaults to all five memory proposal types if omitted.
 * Requires operator authentication.
 */
export async function POST(req: NextRequest) {
  if (!authorizeRegistryWrite(req)) {
    return registryWriteUnauthorizedResponse();
  }

  const body = (await req.json().catch(() => null)) as {
    traceId?: unknown;
    runId?: unknown;
    proposalTypes?: unknown;
  } | null;

  if (typeof body?.traceId !== "string" || typeof body.runId !== "string") {
    return Response.json({ error: "traceId and runId are required" }, { status: 400 });
  }

  // Filter proposal types to memory-specific ones only.
  const requestedTypes: string[] = Array.isArray(body.proposalTypes)
    ? (body.proposalTypes as unknown[]).filter((t): t is string => typeof t === "string")
    : [...MEMORY_PROPOSAL_TYPES];

  const validTypes = requestedTypes.filter(isMemoryProposalType);
  if (validTypes.length === 0) {
    return Response.json(
      { error: `proposalTypes must include at least one of: ${MEMORY_PROPOSAL_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const service = new SealService();

    // Build drafts for the selected memory proposal types only.
    const run = service["evalService"].getRunById(body.runId);
    if (!run) {
      return Response.json({ error: `Eval run not found: ${body.runId}` }, { status: 404 });
    }
    if (run.traceId !== body.traceId) {
      return Response.json(
        { error: `Eval run ${body.runId} does not belong to trace ${body.traceId}` },
        { status: 400 }
      );
    }

    // Use SealService.createProposal for each valid type directly.
    const { ensureProposalType, registryEntryFor } = await import("@/lib/seal/proposal-registry");
    const proposals = validTypes.map((type) => {
      const entry = registryEntryFor(type);
      const draft = {
        proposalType: ensureProposalType(type),
        ...entry.buildDraft({
          traceId: body.traceId as string,
          runId: body.runId as string,
          agentId: run.agentId,
          baselineW: run.compositeW,
          baselineLayers: run.layers,
        }),
      };
      return service.createProposal(draft);
    });

    return Response.json({ ok: true, proposals, timestamp: new Date().toISOString() });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Memory proposal reflection failed" },
      { status: 400 }
    );
  }
}
