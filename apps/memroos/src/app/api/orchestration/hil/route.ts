import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";
import { listOrchestrationHil } from "@/lib/orchestration/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!authorizeRegistryWrite(request)) {
    return registryWriteUnauthorizedResponse();
  }

  try {
    const result = await listOrchestrationHil();
    return Response.json({ ok: true, decisions: result.decisions, timestamp: new Date().toISOString() });
  } catch (error) {
    return Response.json({
      ok: false,
      decisions: [],
      error: error instanceof Error ? error.message : "Orchestration HIL service unavailable",
      status: "unavailable",
      timestamp: new Date().toISOString(),
    });
  }
}
