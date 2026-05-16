import type { NextRequest } from "next/server";

import { getDb } from "@/lib/db";
import { listEvalRuns } from "@/lib/evals/persistence";

export const dynamic = "force-dynamic";

function limitFrom(value: string | null): number {
  const parsed = value ? Number(value) : 25;
  return Number.isFinite(parsed) ? Math.min(100, Math.max(1, parsed)) : 25;
}

export function GET(req: NextRequest) {
  const url = req.nextUrl ?? new URL(req.url);
  return Response.json({
    runs: listEvalRuns(getDb(), limitFrom(url.searchParams.get("limit"))),
    timestamp: new Date().toISOString(),
  });
}
