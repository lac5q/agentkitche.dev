import type { NextRequest } from "next/server";

import { authenticateUser } from "@/lib/auth/session";
import { SealService } from "@/lib/seal/service";

export const dynamic = "force-dynamic";

function limitFrom(value: string | null): number {
  const parsed = value ? Number(value) : 50;
  return Number.isFinite(parsed) ? Math.min(200, Math.max(1, parsed)) : 50;
}

export async function GET(req: NextRequest) {
  const session = await authenticateUser(req);
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const url = req.nextUrl ?? new URL(req.url);
  const service = new SealService();
  return Response.json({
    entries: service.queryAuditLog({
      proposalId: url.searchParams.get("proposalId") ?? undefined,
      limit: limitFrom(url.searchParams.get("limit")),
    }),
    timestamp: new Date().toISOString(),
  });
}
