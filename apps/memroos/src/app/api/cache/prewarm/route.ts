import { prewarmResponseCaches, responseCache } from "@/lib/response-cache";

export const dynamic = "force-dynamic";

export async function POST() {
  const warmed = await prewarmResponseCaches();
  return Response.json({
    ok: true,
    warmed: warmed.length,
    stats: responseCache.stats(),
    timestamp: new Date().toISOString(),
  });
}
