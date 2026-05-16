/**
 * GET /api/public/v1/runs/[runId]
 *
 * Phase 62: Retrieve a scored eval run by ID, scoped to the authenticated tenant.
 * Returns 403 if the run exists but belongs to a different tenant.
 *
 * Auth: Authorization: Bearer <api_key>
 */
import type { NextRequest } from "next/server";

import { authenticateTenantRequest } from "@/lib/public-api/auth";
import { EvalService } from "@/lib/evals/service";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type RunTenantRow = { tenant_id: string };

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  // --- Authentication ---
  const tenant = authenticateTenantRequest(req);
  if (!tenant) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { runId } = await params;
  if (!runId) {
    return Response.json({ error: "runId is required" }, { status: 400 });
  }

  const db = getDb();
  const service = new EvalService(db);
  const run = service.getRunById(runId);

  if (!run) {
    return Response.json({ error: "Run not found" }, { status: 404 });
  }

  // Verify tenant ownership via the database row (tenant_id column added in Phase 62).
  const row = db
    .prepare("SELECT tenant_id FROM eval_runs WHERE id = ?")
    .get(runId) as RunTenantRow | undefined;

  const runTenantId = row?.tenant_id ?? "default-tenant";
  if (runTenantId !== tenant.tenantId) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  return Response.json({ run });
}
