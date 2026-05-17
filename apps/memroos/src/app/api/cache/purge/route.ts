import type { NextRequest } from "next/server";
import { responseCache } from "@/lib/response-cache";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { tag?: unknown } | null;
  const tag = typeof body?.tag === "string" && body.tag.trim() ? body.tag.trim() : null;
  const purged = tag ? responseCache.invalidateTag(tag) : responseCache.purge();
  return Response.json({ ok: true, purged, tag, timestamp: new Date().toISOString() });
}
