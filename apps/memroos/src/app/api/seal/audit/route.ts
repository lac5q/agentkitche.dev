import type { NextRequest } from "next/server";

import { SealService } from "@/lib/seal/service";

export const dynamic = "force-dynamic";

function limitFrom(value: string | null): number {
  const parsed = value ? Number(value) : 50;
  return Number.isFinite(parsed) ? Math.min(200, Math.max(1, parsed)) : 50;
}

export function GET(req: NextRequest) {
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
