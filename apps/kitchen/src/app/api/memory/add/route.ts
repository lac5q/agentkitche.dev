import { authenticateAgentHeaders, recordMemoryWrite } from "@/lib/agent-registry";
import { MEM0_URL } from "@/lib/constants";
import { buildTieredMemoryPayload, resolveMemoryTier } from "@/lib/memory/tiers";

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
  if (!isRecord(body)) {
    return Response.json({ ok: false, error: "Invalid memory payload" }, { status: 400 });
  }

  let mem0Response: Response;
  let result: Record<string, unknown>;
  const tieredBody = buildTieredMemoryPayload(body);
  const tier = resolveMemoryTier(tieredBody);

  try {
    mem0Response = await fetch(`${MEM0_URL}/memory/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tieredBody),
      signal: AbortSignal.timeout(5000),
    });
    result = (await mem0Response.json().catch(() => ({}))) as Record<string, unknown>;
  } catch {
    return Response.json({ ok: false, error: "Memory backend unavailable" }, { status: 502 });
  }

  if (!mem0Response.ok) {
    return Response.json({ ok: false, error: "Memory backend unavailable" }, { status: 502 });
  }

  recordMemoryWrite(
    agent.id,
    {
      type: tier,
      content: typeof body.content === "string" ? body.content : undefined,
      metadata: isRecord(tieredBody.metadata) ? tieredBody.metadata : {},
    },
    result
  );

  return Response.json({ ok: true, tier, result, timestamp: new Date().toISOString() });
}
