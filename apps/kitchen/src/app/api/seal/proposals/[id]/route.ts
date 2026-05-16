import type { NextRequest } from "next/server";

import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";
import { SealService } from "@/lib/seal/service";
import type { ProposalCommandAction } from "@/lib/seal/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

function isAction(value: unknown): value is ProposalCommandAction {
  return value === "approve" || value === "reject" || value === "apply";
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { id } = await ctx.params;
  const service = new SealService();
  const proposal = service.getProposal(id);
  if (!proposal) return Response.json({ error: "proposal not found" }, { status: 404 });
  return Response.json({ proposal, timestamp: new Date().toISOString() });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  if (!authorizeRegistryWrite(req)) {
    return registryWriteUnauthorizedResponse();
  }

  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as {
    action?: unknown;
    reasoning?: unknown;
    operator?: unknown;
  } | null;
  if (!isAction(body?.action)) {
    return Response.json({ error: "action must be approve, reject, or apply" }, { status: 400 });
  }

  try {
    const service = new SealService();
    const result = await service.handleAction(id, body.action, {
      reasoning: typeof body.reasoning === "string" ? body.reasoning : undefined,
      operator: typeof body.operator === "string" ? body.operator : undefined,
    });
    return Response.json({ ok: true, ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "SEAL decision failed" },
      { status: 400 }
    );
  }
}
