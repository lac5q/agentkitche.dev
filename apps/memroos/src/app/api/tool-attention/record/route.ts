import { authenticateAgentHeaders, recordToolOutcome } from "@/lib/agent-registry";
import { appendToolAttentionOutcome } from "@/lib/tool-attention";

export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as unknown;
  const agentIdHint = isRecord(body) && typeof body.agentId === "string" ? body.agentId : undefined;
  const agent = authenticateAgentHeaders(request.headers, agentIdHint);
  if (!agent) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isRecord(body) || typeof body.toolId !== "string" || typeof body.outcome !== "string") {
    return Response.json({ ok: false, error: "toolId and outcome are required" }, { status: 400 });
  }

  const metadata = {
    ...(isRecord(body.metadata) ? body.metadata : {}),
    agent_id: agent.id,
  };
  appendToolAttentionOutcome({
    timestamp: new Date().toISOString(),
    toolId: body.toolId,
    task: typeof body.task === "string" ? body.task : "",
    outcome: body.outcome,
    metadata,
  });
  recordToolOutcome(agent.id, { toolId: body.toolId, outcome: body.outcome, metadata });

  return Response.json({ ok: true, agentId: agent.id, timestamp: new Date().toISOString() });
}
