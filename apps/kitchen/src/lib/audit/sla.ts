/**
 * Phase 64: SLA breach detection service.
 *
 * Called lazily on each GET /api/escalations to mark overdue open escalations.
 */

import type Database from "better-sqlite3";
import { getDb } from "@/lib/db";
import { writeAuditEntry } from "./write";

/**
 * Checks for SLA breaches: queries open escalations past their sla_deadline,
 * transitions them to 'sla_breached', and writes hil.sla_breached audit entries.
 *
 * @param db - Optional DB instance; uses singleton if not provided.
 * @returns Count of newly breached escalations.
 */
export function checkSlaBreaches(db: Database.Database = getDb()): number {
  type BreachedRow = { id: string; tenant_id: string; entity_type: string; entity_id: string };

  const breached = db
    .prepare(
      `SELECT id, tenant_id, entity_type, entity_id
       FROM hil_escalations
       WHERE status = 'open' AND sla_deadline < strftime('%Y-%m-%dT%H:%M:%SZ','now')`
    )
    .all() as BreachedRow[];

  if (breached.length === 0) return 0;

  const now = new Date().toISOString();

  const markBreached = db.transaction(() => {
    for (const row of breached) {
      db.prepare(
        `UPDATE hil_escalations SET status = 'sla_breached' WHERE id = ? AND status = 'open'`
      ).run(row.id);

      writeAuditEntry(
        {
          tenant_id: row.tenant_id,
          actor_id: "system",
          actor_role: "system",
          event_type: "hil.sla_breached",
          entity_type: "hil_escalation",
          entity_id: `hil_escalation:${row.id}`,
          reason: "SLA deadline exceeded without resolution",
          metadata_json: {
            escalation_id: row.id,
            entity_type: row.entity_type,
            entity_id: row.entity_id,
          },
          created_at: now,
        },
        db
      );
    }
  });

  markBreached();
  return breached.length;
}
