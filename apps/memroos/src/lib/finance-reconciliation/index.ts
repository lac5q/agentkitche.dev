import type Database from "better-sqlite3";

import { getDb } from "@/lib/db";
import type { EvalConfig, GoldenSetExample } from "@/lib/evals/types";
import { AUDIT_EVENT_TYPES, ENTITY_TYPES } from "@/lib/audit/event-types";
import type { AuditEventType } from "@/lib/audit/event-types";
import { openEscalation, writeAuditEntry } from "@/lib/audit/write";
import type { BusinessOutcomeEvent } from "@/lib/l3/types";
export { resolveFinanceTerminology } from "./terminology";
export type { FinanceTerminology } from "./terminology";

export type ReconciliationStatus = "matched" | "mismatched" | "exception" | "duplicate";

export interface TransactionReconciliationEvent {
  transactionId: string;
  correlationId: string;
  tenantId: string;
  agentId?: string;
  amount: number;
  expectedAmount: number;
  status: ReconciliationStatus;
  confidence: number;
  reason?: string;
  occurredAt: string;
  sourceRowId?: string;
  raw: Record<string, unknown>;
}

export interface ReconciliationProcessOptions {
  actorId?: string;
  tenantId?: string;
  openHilForExceptions?: boolean;
}

export interface ReconciliationSummary {
  processed: number;
  matched: number;
  mismatched: number;
  exceptions: number;
  duplicates: number;
  escalated: number;
  outcomeEvents: number;
  auditEntries: number;
  hilEscalations: number;
}

export interface FinanceGoldenSetCoverage {
  ok: boolean;
  coverage: { match: boolean; mismatch: boolean; escalation: boolean };
  agreementFloor: 0.85;
}

const STATUS_EVENT_TYPE: Record<ReconciliationStatus, AuditEventType> = {
  matched: AUDIT_EVENT_TYPES.FINANCE_RECONCILIATION_MATCHED,
  mismatched: AUDIT_EVENT_TYPES.FINANCE_RECONCILIATION_MISMATCHED,
  exception: AUDIT_EVENT_TYPES.FINANCE_RECONCILIATION_EXCEPTION,
  duplicate: AUDIT_EVENT_TYPES.FINANCE_RECONCILIATION_DUPLICATE,
};

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let quoted = false;

  for (let i = 0; i < csv.length; i += 1) {
    const char = csv[i];
    const next = csv[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      row.push(current.trim());
      current = "";
      continue;
    }
    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      current = "";
      continue;
    }
    current += char;
  }

  row.push(current.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

function normalizeStatus(value: unknown): ReconciliationStatus {
  const status = String(value ?? "exception").trim().toLowerCase();
  if (status === "matched" || status === "mismatched" || status === "exception" || status === "duplicate") {
    return status;
  }
  return "exception";
}

function numberField(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function stringField(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalizeCsvHeader(header: string): string {
  const compact = header.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const aliases: Record<string, string> = {
    transactionid: "transaction_id",
    correlationid: "correlation_id",
    tenantid: "tenant_id",
    agentid: "agent_id",
    expectedamount: "expected_amount",
    occurredat: "occurred_at",
    sourcerowid: "source_row_id",
  };
  return aliases[compact] ?? header.trim().toLowerCase();
}

export function normalizeWebhookTransaction(payload: Record<string, unknown>): TransactionReconciliationEvent {
  const transactionId = stringField(payload.transaction_id ?? payload.transactionId, crypto.randomUUID());
  const correlationId = stringField(payload.correlation_id ?? payload.correlationId, transactionId);
  const occurredAt = stringField(payload.occurred_at ?? payload.occurredAt, new Date().toISOString());
  const amount = numberField(payload.amount);
  const expectedAmount = numberField(payload.expected_amount ?? payload.expectedAmount, amount);

  return {
    transactionId,
    correlationId,
    tenantId: stringField(payload.tenant_id ?? payload.tenantId, "default-tenant"),
    agentId: stringField(payload.agent_id ?? payload.agentId, "") || undefined,
    amount,
    expectedAmount,
    status: normalizeStatus(payload.status),
    confidence: Math.max(0, Math.min(1, numberField(payload.confidence, 0.5))),
    reason: stringField(payload.reason, "") || undefined,
    occurredAt,
    sourceRowId: stringField(payload.source_row_id ?? payload.sourceRowId, "") || undefined,
    raw: payload,
  };
}

export function parseTransactionCsv(csv: string): TransactionReconciliationEvent[] {
  const [headers = [], ...rows] = parseCsvRows(csv);
  const normalizedHeaders = headers.map(normalizeCsvHeader);

  return rows.map((cells, index) => {
    const payload: Record<string, unknown> = {};
    for (const [cellIndex, cell] of cells.entries()) {
      payload[normalizedHeaders[cellIndex] ?? `column_${cellIndex}`] = cell;
    }
    if (!payload.source_row_id) payload.source_row_id = `csv-row-${index + 2}`;
    return normalizeWebhookTransaction(payload);
  });
}

function scoreAmountDelta(event: TransactionReconciliationEvent): number {
  const delta = Math.abs(event.amount - event.expectedAmount);
  const denominator = Math.max(Math.abs(event.expectedAmount), 1);
  return Math.max(0, Math.min(1, 1 - delta / denominator));
}

function eventToOutcomeEvents(event: TransactionReconciliationEvent): BusinessOutcomeEvent[] {
  const completion =
    event.status === "matched" ? 1 : event.status === "duplicate" ? 0.85 : event.status === "mismatched" ? 0.35 : 0;
  const escalation = event.status === "matched" || event.status === "duplicate" ? 1 : 0;
  const approval = event.status === "matched" ? 1 : event.status === "duplicate" ? 0.8 : event.status === "mismatched" ? 0.45 : 0.1;
  const amountDelta = scoreAmountDelta(event);
  const rawJson = JSON.stringify({
    ...event.raw,
    transactionId: event.transactionId,
    reconciliationStatus: event.status,
    amount: event.amount,
    expectedAmount: event.expectedAmount,
    confidence: event.confidence,
    reason: event.reason,
  });
  const common = {
    tenantId: event.tenantId,
    correlationId: event.correlationId,
    sourceSystem: "finance" as const,
    adapter: "bank_reconciliation",
    rawJson,
    agentId: event.agentId,
    polledAt: event.occurredAt,
  };

  return [
    { ...common, eventType: `reconciliation_${event.status}_completion`, kpiKey: "completion_rate", kpiValue: completion },
    { ...common, eventType: `reconciliation_${event.status}_escalation`, kpiKey: "escalation_rate", kpiValue: escalation },
    { ...common, eventType: `reconciliation_${event.status}_approval`, kpiKey: "approval_rate", kpiValue: approval },
    { ...common, eventType: `reconciliation_${event.status}_amount_delta`, kpiKey: "cost_per_task", kpiValue: amountDelta },
  ];
}

function writeOutcomeEvents(db: Database.Database, events: BusinessOutcomeEvent[]): number {
  const stmt = db.prepare(
    `INSERT OR IGNORE INTO business_outcome_events
      (tenant_id, correlation_id, source_system, adapter, event_type, kpi_key, kpi_value, raw_json, agent_id, polled_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  let written = 0;
  for (const event of events) {
    const info = stmt.run(
      event.tenantId,
      event.correlationId,
      event.sourceSystem,
      event.adapter,
      event.eventType,
      event.kpiKey,
      event.kpiValue,
      event.rawJson,
      event.agentId ?? null,
      event.polledAt
    );
    written += info.changes;
  }
  return written;
}

function shouldEscalate(event: TransactionReconciliationEvent): boolean {
  return event.status === "mismatched" || event.status === "exception";
}

export function processReconciliationEvents(
  events: TransactionReconciliationEvent[],
  db: Database.Database = getDb(),
  options: ReconciliationProcessOptions = {}
): ReconciliationSummary {
  const summary: ReconciliationSummary = {
    processed: 0,
    matched: 0,
    mismatched: 0,
    exceptions: 0,
    duplicates: 0,
    escalated: 0,
    outcomeEvents: 0,
    auditEntries: 0,
    hilEscalations: 0,
  };

  db.transaction(() => {
    for (const event of events) {
      const tenantId = options.tenantId ?? event.tenantId;
      const normalizedEvent = { ...event, tenantId };
      summary.processed += 1;
      if (event.status === "matched") summary.matched += 1;
      if (event.status === "mismatched") summary.mismatched += 1;
      if (event.status === "exception") summary.exceptions += 1;
      if (event.status === "duplicate") summary.duplicates += 1;

      summary.outcomeEvents += writeOutcomeEvents(db, eventToOutcomeEvents(normalizedEvent));
      writeAuditEntry(
        {
          tenant_id: tenantId,
          actor_id: options.actorId ?? event.agentId ?? "finance-reconciliation",
          actor_role: "system",
          event_type: STATUS_EVENT_TYPE[event.status],
          entity_type: ENTITY_TYPES.FINANCE_RECONCILIATION,
          entity_id: `finance_transaction:${event.transactionId}`,
          reason: event.reason ?? `Reconciliation ${event.status}`,
          metadata_json: {
            transaction_id: event.transactionId,
            correlation_id: event.correlationId,
            status: event.status,
            amount: event.amount,
            expected_amount: event.expectedAmount,
            confidence: event.confidence,
            source_row_id: event.sourceRowId,
          },
          created_at: event.occurredAt,
        },
        db
      );
      summary.auditEntries += 1;

      if ((options.openHilForExceptions ?? true) && shouldEscalate(event)) {
        summary.escalated += 1;
        openEscalation(
          {
            tenant_id: tenantId,
            entity_type: "finance_reconciliation",
            entity_id: `finance_transaction:${event.transactionId}`,
            escalation_type: "agent_escalate",
            opened_by: options.actorId ?? event.agentId ?? "finance-reconciliation",
          },
          db
        );
        summary.hilEscalations += 1;
      }
    }
  })();

  return summary;
}

export function generateMockTransactions(count = 100): TransactionReconciliationEvent[] {
  return Array.from({ length: count }, (_, index) => {
    const n = index + 1;
    const status: ReconciliationStatus =
      n % 25 === 0 ? "exception" : n % 10 === 0 ? "mismatched" : n % 17 === 0 ? "duplicate" : "matched";
    const amount = 100 + n;
    const expectedAmount = status === "mismatched" ? amount - 7.5 : amount;
    return {
      transactionId: `demo-txn-${String(n).padStart(3, "0")}`,
      correlationId: `demo-recon-${String(n).padStart(3, "0")}`,
      tenantId: "default-tenant",
      agentId: "finance-reconciliation-agent",
      amount,
      expectedAmount,
      status,
      confidence: status === "matched" ? 0.98 : status === "duplicate" ? 0.86 : status === "mismatched" ? 0.62 : 0.35,
      reason: status === "matched" ? "deterministic demo match" : "deterministic demo review item",
      occurredAt: new Date(Date.UTC(2026, 4, 17, 12, 0, n % 60)).toISOString(),
      sourceRowId: `demo-row-${n}`,
      raw: { demo: true, row: n },
    };
  });
}

export function validateFinanceGoldenSetExamples(
  examples: Array<Pick<GoldenSetExample, "tags" | "humanScore">>
): FinanceGoldenSetCoverage {
  const tags = examples.map((example) => new Set(example.tags ?? []));
  const coverage = {
    match: tags.some((set) => set.has("match")),
    mismatch: tags.some((set) => set.has("mismatch")),
    escalation: tags.some((set) => set.has("escalation")),
  };
  return {
    ok: coverage.match && coverage.mismatch && coverage.escalation,
    coverage,
    agreementFloor: 0.85,
  };
}
