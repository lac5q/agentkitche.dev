import { authenticateAgentHeaders, recordSkillReport } from "@/lib/agent-registry";

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
  if (!isRecord(body) || typeof body.skillId !== "string" || typeof body.action !== "string") {
    return Response.json({ ok: false, error: "skillId and action are required" }, { status: 400 });
  }

  recordSkillReport(agent.id, {
    skillId: body.skillId,
    action: body.action,
    metadata: isRecord(body.metadata) ? body.metadata : {},
  });
  return Response.json({ ok: true, agentId: agent.id, timestamp: new Date().toISOString() });
}
