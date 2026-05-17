import type { NextRequest } from "next/server";
import { authenticateUser } from "@/lib/auth/session";
import { evaluateContextSources, loadContextSourceContracts } from "@/lib/context-sources";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await authenticateUser(req);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const health = evaluateContextSources(loadContextSourceContracts());
    return Response.json(health);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to evaluate context sources" },
      { status: 500 }
    );
  }
}
