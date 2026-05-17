import type { NextRequest } from "next/server";

import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";
import { authenticateUser } from "@/lib/auth/session";
import { SealService } from "@/lib/seal/service";
import type { ProposalStatus } from "@/lib/seal/types";

export const dynamic = "force-dynamic";

const STATUSES: ProposalStatus[] = ["pending", "approved", "rejected", "applied", "rolled_back"];

function statusFrom(value: string | null): ProposalStatus | undefined {
  return value && STATUSES.includes(value as ProposalStatus) ? (value as ProposalStatus) : undefined;
}

export async function GET(req: NextRequest) {
  const session = await authenticateUser(req);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = req.nextUrl ?? new URL(req.url);
  const service = new SealService();
  return Response.json({
    proposals: service.listProposals({ status: statusFrom(url.searchParams.get("status")) }),
    timestamp: new Date().toISOString(),
  });
}

export async function POST(req: NextRequest) {
  if (!authorizeRegistryWrite(req)) {
    return registryWriteUnauthorizedResponse();
  }

  const body = (await req.json().catch(() => null)) as { traceId?: unknown; runId?: unknown } | null;
  if (typeof body?.traceId !== "string" || typeof body.runId !== "string") {
    return Response.json({ error: "traceId and runId are required" }, { status: 400 });
  }

  try {
    const service = new SealService();
    const proposals = await service.reflectOnTrace(body.traceId, body.runId);
    return Response.json({ ok: true, proposals, timestamp: new Date().toISOString() });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "SEAL reflection failed" },
      { status: 400 }
    );
  }
}
