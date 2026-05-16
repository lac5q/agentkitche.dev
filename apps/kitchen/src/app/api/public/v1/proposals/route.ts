/**
 * GET /api/public/v1/proposals
 *
 * Phase 62: List SEAL proposals scoped to the authenticated tenant.
 * Optional query param: ?traceId= to filter by trace.
 *
 * Auth: Authorization: Bearer <api_key>
 */
import type { NextRequest } from "next/server";

import { authenticateTenantRequest } from "@/lib/public-api/auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type ProposalSummaryRow = {
  id: string;
  proposal_type: string;
  status: string;
  forecast_w_delta: number;
  created_at: string;
};

export async function GET(req: NextRequest) {
  // --- Authentication ---
  const tenant = authenticateTenantRequest(req);
  if (!tenant) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const traceId = searchParams.get("traceId");

  const db = getDb();

  let rows: ProposalSummaryRow[];
  if (traceId) {
    rows = db
      .prepare(
        "SELECT id, proposal_type, status, forecast_w_delta, created_at " +
          "FROM seal_proposals WHERE tenant_id = ? AND trace_id = ? ORDER BY created_at DESC"
      )
      .all(tenant.tenantId, traceId) as ProposalSummaryRow[];
  } else {
    rows = db
      .prepare(
        "SELECT id, proposal_type, status, forecast_w_delta, created_at " +
          "FROM seal_proposals WHERE tenant_id = ? ORDER BY created_at DESC"
      )
      .all(tenant.tenantId) as ProposalSummaryRow[];
  }

  const proposals = rows.map((row) => ({
    id: row.id,
    proposalType: row.proposal_type,
    status: row.status,
    forecastWDelta: row.forecast_w_delta,
    createdAt: row.created_at,
  }));

  return Response.json({ proposals });
}
