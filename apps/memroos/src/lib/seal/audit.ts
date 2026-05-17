import crypto from "crypto";
import type Database from "better-sqlite3";

import { getDb } from "@/lib/db";
import type { AuditFilter, SealAuditEntry, StoredSealAuditEntry } from "./types";
import { writeAuditEntry as writeUnifiedAuditEntry } from "@/lib/audit/write";

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

/**
 * SEAL audit write — dual-write shim (Phase 64 → Phase 65 cutover).
 *
 * Writes to both:
 * 1. seal_audit_log (backward compat; removed in Phase 65 cutover)
 * 2. audit_entries (unified, immutable log via writeUnifiedAuditEntry)
 *
 * The old signature is preserved — no callers change.
 */
const SEAL_EVENT_MAP: Record<string, string> = {
  proposed: "seal.proposed",
  approved: "seal.approved",
  rejected: "seal.rejected",
  apply_started: "seal.apply_started",
  apply_succeeded: "seal.apply_succeeded",
  apply_failed: "seal.apply_failed",
  rolled_back: "seal.rolled_back",
};

export function writeAuditEntry(entry: SealAuditEntry, db: Database.Database = getDb()): void {
  const sealId = entry.id ?? `seal-audit-${crypto.randomUUID()}`;
  const timestamp = entry.timestamp ?? new Date().toISOString();
  const detailJson = JSON.stringify(entry.detail ?? {});

  // Legacy write: keep seal_audit_log populated during transition
  db.prepare(
    "INSERT INTO seal_audit_log (" +
      "id, proposal_id, event, baseline_w, post_apply_w, delta_l1, delta_l2, delta_l3, delta_composite, detail_json, timestamp" +
    ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    sealId,
    entry.proposalId,
    entry.event,
    entry.baselineW ?? null,
    entry.postApplyW ?? null,
    entry.deltaL1 ?? null,
    entry.deltaL2 ?? null,
    entry.deltaL3 ?? null,
    entry.deltaComposite ?? null,
    detailJson,
    timestamp
  );

  // Phase 64 dual-write: unified audit_entries
  try {
    const eventType = SEAL_EVENT_MAP[entry.event] ?? `seal.${entry.event}`;
    writeUnifiedAuditEntry(
      {
        actor_id: "system",
        actor_role: "system",
        event_type: eventType as import("@/lib/audit/event-types").AuditEventType,
        entity_type: "seal_proposal",
        entity_id: `seal_proposal:${entry.proposalId}`,
        metadata_json: {
          baseline_w: entry.baselineW,
          post_apply_w: entry.postApplyW,
          delta_l1: entry.deltaL1,
          delta_l2: entry.deltaL2,
          delta_l3: entry.deltaL3,
          delta_composite: entry.deltaComposite,
          ...entry.detail,
        },
        created_at: timestamp,
      },
      db
    );
  } catch (err) {
    // Log but do not throw — the primary seal_audit_log write succeeded.
    // Unified write failures are non-fatal during the transition period.
    console.error("[seal/audit] unified audit_entries dual-write failed:", err);
  }
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
