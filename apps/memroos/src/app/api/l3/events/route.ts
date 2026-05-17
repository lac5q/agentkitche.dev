/**
 * Phase 61 — GET /api/l3/events: list business_outcome_events
 * POST /api/l3/events: manually ingest an event (auth-gated)
 */

import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";
import type { BusinessOutcomeEvent } from "@/lib/l3/types";

export const dynamic = "force-dynamic";

interface EventRow {
  id: number;
  tenant_id: string;
  correlation_id: string;
  source_system: string;
  adapter: string;
  event_type: string;
  kpi_key: string;
  kpi_value: number;
  raw_json: string;
  agent_id: string | null;
  polled_at: string;
  created_at: string;
}

function rowToEvent(row: EventRow): BusinessOutcomeEvent & { id: number; createdAt: string } {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    correlationId: row.correlation_id,
    sourceSystem: row.source_system as BusinessOutcomeEvent["sourceSystem"],
    adapter: row.adapter,
    eventType: row.event_type,
    kpiKey: row.kpi_key,
    kpiValue: row.kpi_value,
    rawJson: row.raw_json,
    agentId: row.agent_id ?? undefined,
    polledAt: row.polled_at,
    createdAt: row.created_at,
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const correlationId = searchParams.get("correlationId");
  const agentId = searchParams.get("agentId");
  const since = searchParams.get("since");
  const limit = Math.min(200, parseInt(searchParams.get("limit") ?? "50", 10));

  try {
    const db = getDb();
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    if (correlationId) {
      conditions.push("correlation_id = ?");
      params.push(correlationId);
    }
    if (agentId) {
      conditions.push("agent_id = ?");
      params.push(agentId);
    }
    if (since) {
      conditions.push("polled_at >= ?");
      params.push(since);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    params.push(limit);

    const rows = db
      .prepare<(string | number)[], EventRow>(
        `SELECT id, tenant_id, correlation_id, source_system, adapter, event_type,
                kpi_key, kpi_value, raw_json, agent_id, polled_at, created_at
         FROM business_outcome_events
         ${where}
         ORDER BY polled_at DESC
         LIMIT ?`
      )
      .all(...params);

    return Response.json({
      events: rows.map(rowToEvent),
      count: rows.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to list events" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!authorizeRegistryWrite(req)) {
    return registryWriteUnauthorizedResponse();
  }

  const body = (await req.json().catch(() => null)) as Partial<BusinessOutcomeEvent> | null;
  if (!body || !body.correlationId || !body.sourceSystem || !body.adapter || !body.eventType || !body.kpiKey) {
    return Response.json(
      { error: "correlationId, sourceSystem, adapter, eventType, and kpiKey are required" },
      { status: 400 }
    );
  }

  try {
    const db = getDb();
    const polledAt = body.polledAt ?? new Date().toISOString();

    const info = db
      .prepare(
        `INSERT OR IGNORE INTO business_outcome_events
           (tenant_id, correlation_id, source_system, adapter, event_type, kpi_key, kpi_value, raw_json, agent_id, polled_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        body.tenantId ?? "default-tenant",
        body.correlationId,
        body.sourceSystem,
        body.adapter,
        body.eventType,
        body.kpiKey,
        body.kpiValue ?? 0,
        body.rawJson ?? "{}",
        body.agentId ?? null,
        polledAt
      );

    return Response.json({
      ok: true,
      inserted: info.changes > 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to insert event" },
      { status: 500 }
    );
  }
}
