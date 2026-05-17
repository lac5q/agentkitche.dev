import type { NextRequest } from "next/server";
import { deregisterAgent, getRegisteredAgent } from "@/lib/agent-registry";
import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const agent = getRegisteredAgent(id);
  if (!agent) {
    return Response.json({ error: `Agent not found: ${id}` }, { status: 404 });
  }
  return Response.json({ agent, timestamp: new Date().toISOString() });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!authorizeRegistryWrite(request)) {
    return registryWriteUnauthorizedResponse();
  }

  const { id } = await params;
  const agent = deregisterAgent(id);
  if (!agent) {
    return Response.json({ error: `Agent not found: ${id}` }, { status: 404 });
  }
  return Response.json({ ok: true, agent, timestamp: new Date().toISOString() });
}
