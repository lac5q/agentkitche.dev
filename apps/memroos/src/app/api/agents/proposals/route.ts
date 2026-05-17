import type { NextRequest } from "next/server";

import { getDb } from "@/lib/db";
import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";
import { SealService } from "@/lib/seal/service";

export const dynamic = "force-dynamic";

const AGENT_PROPOSAL_TYPES = new Set([
  "agent_instruction_patch",
  "skill_addition",
  "tool_routing_update",
]);

/**
 * GET /api/agents/proposals
 * Lists agent-specific SEAL proposals filtered to the three agent proposal types.
 * Optional ?status= query parameter filters by proposal status.
 */
export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status") as
    | "pending"
    | "approved"
    | "rejected"
    | "applied"
    | "rolled_back"
    | null;

  const db = getDb();
  const service = new SealService({ db });

  const allProposals = statusFilter
    ? service.listProposals({ status: statusFilter })
    : service.listProposals();

  const proposals = allProposals.filter((p) =>
    AGENT_PROPOSAL_TYPES.has(p.proposalType)
  );

  return Response.json({
    proposals,
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/agents/proposals
 * Triggers reflection for an agent to generate new agent proposals.
 * Body: { action: "reflect"; agentId: string }
 * Auth-gated via authorizeRegistryWrite.
 */
export async function POST(req: NextRequest) {
  if (!authorizeRegistryWrite(req)) {
    return registryWriteUnauthorizedResponse();
  }

  const body = (await req.json().catch(() => null)) as {
    action?: string;
    agentId?: string;
    traceId?: string;
    runId?: string;
  } | null;

  if (!body || body.action !== "reflect") {
    return Response.json({ error: "action 'reflect' is required" }, { status: 400 });
  }

  if (!body.agentId) {
    return Response.json({ error: "agentId is required" }, { status: 400 });
  }

  // For the reflect action, we need a traceId and runId to operate on.
  // If not provided, we return a structured placeholder response indicating
  // that a prior eval run must exist for the agent before reflection can proceed.
  if (!body.traceId || !body.runId) {
    return Response.json(
      {
        error: "traceId and runId are required for reflection; run an eval for the agent first",
        hint: "POST /api/evals/run to produce an eval run, then pass its traceId and id here",
      },
      { status: 400 }
    );
  }

  const db = getDb();
  const service = new SealService({ db });

  const proposals = await service.reflectOnTrace(body.traceId, body.runId);
  const agentProposals = proposals.filter((p) =>
    AGENT_PROPOSAL_TYPES.has(p.proposalType)
  );

  return Response.json({
    ok: true,
    proposals: agentProposals,
    timestamp: new Date().toISOString(),
  });
}
