import crypto from "crypto";
import type Database from "better-sqlite3";

import { getDb } from "@/lib/db";
import type { AuditFilter, SealAuditEntry, StoredSealAuditEntry } from "./types";

type AuditRow = {
  id: string;
  proposal_id: string;
  event: StoredSealAuditEntry["event"];
  baseline_w: number | null;
  post_apply_w: number | null;
  delta_l1: number | null;
  delta_l2: number | null;
  delta_l3: number | null;
  delta_composite: number | null;
  detail_json: string;
  timestamp: string;
};

function rowToAuditEntry(row: AuditRow): StoredSealAuditEntry {
  return {
    id: row.id,
    proposalId: row.proposal_id,
    event: row.event,
    baselineW: row.baseline_w,
    postApplyW: row.post_apply_w,
    deltaL1: row.delta_l1,
    deltaL2: row.delta_l2,
    deltaL3: row.delta_l3,
    deltaComposite: row.delta_composite,
    detail: JSON.parse(row.detail_json || "{}"),
    timestamp: row.timestamp,
  };
}

export function writeAuditEntry(entry: SealAuditEntry, db: Database.Database = getDb()): void {
  db.prepare(
    "INSERT INTO seal_audit_log (" +
      "id, proposal_id, event, baseline_w, post_apply_w, delta_l1, delta_l2, delta_l3, delta_composite, detail_json, timestamp" +
    ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    entry.id ?? `seal-audit-${crypto.randomUUID()}`,
    entry.proposalId,
    entry.event,
    entry.baselineW ?? null,
    entry.postApplyW ?? null,
    entry.deltaL1 ?? null,
    entry.deltaL2 ?? null,
    entry.deltaL3 ?? null,
    entry.deltaComposite ?? null,
    JSON.stringify(entry.detail ?? {}),
    entry.timestamp ?? new Date().toISOString()
  );
}

export function queryAuditLog(filter: AuditFilter = {}, db: Database.Database = getDb()): StoredSealAuditEntry[] {
  const limit = Math.min(200, Math.max(1, filter.limit ?? 50));
  const rows = filter.proposalId
    ? db
        .prepare("SELECT * FROM seal_audit_log WHERE proposal_id = ? ORDER BY timestamp DESC LIMIT ?")
        .all(filter.proposalId, limit)
    : db.prepare("SELECT * FROM seal_audit_log ORDER BY timestamp DESC LIMIT ?").all(limit);
  return (rows as AuditRow[]).map(rowToAuditEntry);
}
