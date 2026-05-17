import type { NextRequest } from "next/server";

import { getDb } from "@/lib/db";
import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";
import {
  generateMockTransactions,
  normalizeWebhookTransaction,
  parseTransactionCsv,
  processReconciliationEvents,
} from "@/lib/finance-reconciliation";

export const dynamic = "force-dynamic";

type FinanceReconciliationBody =
  | { mode?: "demo"; count?: number }
  | { mode: "csv"; csv: string }
  | { mode: "webhook"; event: Record<string, unknown> }
  | { mode: "events"; events: Record<string, unknown>[] };

export async function POST(req: NextRequest) {
  if (!authorizeRegistryWrite(req)) {
    return registryWriteUnauthorizedResponse();
  }

  const body = (await req.json().catch(() => null)) as FinanceReconciliationBody | null;
  if (!body) {
    return Response.json({ error: "JSON body required" }, { status: 400 });
  }

  let events;
  if (!("mode" in body) || body.mode === "demo") {
    events = generateMockTransactions(Math.min(500, Math.max(1, body.count ?? 100)));
  } else if (body.mode === "csv") {
    events = parseTransactionCsv(body.csv);
  } else if (body.mode === "webhook") {
    events = [normalizeWebhookTransaction(body.event)];
  } else if (body.mode === "events") {
    events = body.events.map((event) => normalizeWebhookTransaction(event));
  } else {
    return Response.json({ error: "Unsupported finance reconciliation mode" }, { status: 400 });
  }

  const summary = processReconciliationEvents(events, getDb());

  return Response.json({
    ok: true,
    summary,
    timestamp: new Date().toISOString(),
  });
}
