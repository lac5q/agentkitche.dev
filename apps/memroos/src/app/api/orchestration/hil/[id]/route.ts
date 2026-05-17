import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";
import { resolveOrchestrationHil } from "@/lib/orchestration/client";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }> | { id: string };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request, context: RouteContext) {
  if (!authorizeRegistryWrite(request)) {
    return registryWriteUnauthorizedResponse();
  }

  const params = await context.params;
  const body = (await request.json().catch(() => null)) as unknown;
  if (!isRecord(body) || (body.decision !== "approve" && body.decision !== "reject")) {
    return Response.json({ ok: false, error: "decision must be approve or reject" }, { status: 400 });
  }

  try {
    const result = await resolveOrchestrationHil(params.id, body.decision);
    return Response.json({ ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : "Orchestration HIL service unavailable" },
      { status: 502 }
    );
  }
}
