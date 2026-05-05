import { searchVectorMemory } from "@/lib/memory/backends";
import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

function parseLimit(raw: string | null): number {
  const parsed = Number(raw ?? 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), 1), 100) : 10;
}

export async function GET(request: Request) {
  if (!authorizeRegistryWrite(request)) {
    return registryWriteUnauthorizedResponse();
  }

  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "recent";
  const limit = parseLimit(url.searchParams.get("limit"));

  try {
    const result = await searchVectorMemory(query, limit);
    return Response.json({ ok: true, tier: "vector", result, timestamp: new Date().toISOString() });
  } catch (error) {
    return Response.json(
      { ok: false, tier: "vector", error: error instanceof Error ? error.message : "Vector memory backend unavailable" },
      { status: 502 }
    );
  }
}
