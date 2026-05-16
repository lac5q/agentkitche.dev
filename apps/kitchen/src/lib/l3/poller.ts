/**
 * Phase 61 — Business-Ops Outcome Layer (L3)
 * pollAllAdapters: Stage-1 of the two-stage architecture.
 *
 * Iterates all registered adapters, calls poll(), and writes events to the
 * `business_outcome_events` table via the event store.
 */

import type Database from "better-sqlite3";

import type { BusinessSystemAdapter } from "./adapter-interface";
import type { BusinessOutcomeEvent } from "./types";

export interface PollResult {
  adapter: string;
  category: string;
  eventsPolled: number;
  eventsWritten: number;
  error: string | null;
}

export interface PollSummary {
  totalEventsWritten: number;
  errors: string[];
  adapterResults: PollResult[];
  polledAt: string;
}

/**
 * Upsert-safe event write.  Uses INSERT OR IGNORE on a unique composite key
 * (correlation_id, adapter, event_type, polled_at) to avoid duplicates on retry.
 */
function writeEvents(db: Database.Database, events: BusinessOutcomeEvent[]): number {
  if (events.length === 0) return 0;

  const stmt = db.prepare<[string, string, string, string, string, number, string, string, string | null, string]>(`
    INSERT OR IGNORE INTO business_outcome_events
      (tenant_id, correlation_id, source_system, adapter, event_type, kpi_value, kpi_key, raw_json, agent_id, polled_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((rows: BusinessOutcomeEvent[]) => {
    let written = 0;
    for (const row of rows) {
      const info = stmt.run(
        row.tenantId,
        row.correlationId,
        row.sourceSystem,
        row.adapter,
        row.eventType,
        row.kpiValue,
        row.kpiKey,
        row.rawJson,
        row.agentId ?? null,
        row.polledAt
      );
      written += info.changes;
    }
    return written;
  });

  return insertMany(events) as number;
}

/**
 * Polls all provided adapters and writes new events to the database.
 *
 * @param adapters - Array of BusinessSystemAdapter instances to poll.
 * @param db       - SQLite database handle with `business_outcome_events` table.
 * @param since    - Fetch events after this timestamp (default: 5 min ago).
 */
export async function pollAllAdapters(
  adapters: BusinessSystemAdapter[],
  db: Database.Database,
  since: Date = new Date(Date.now() - 5 * 60 * 1000)
): Promise<PollSummary> {
  const polledAt = new Date().toISOString();
  const adapterResults: PollResult[] = [];
  let totalEventsWritten = 0;
  const errors: string[] = [];

  for (const adapter of adapters) {
    let polledEvents: BusinessOutcomeEvent[] = [];
    let adapterError: string | null = null;

    try {
      polledEvents = await adapter.poll(since);
    } catch (err) {
      adapterError = err instanceof Error ? err.message : String(err);
      errors.push(`[${adapter.name}] ${adapterError}`);
      console.error(`[poller] Adapter ${adapter.name} failed: ${adapterError}`);
    }

    let written = 0;
    if (polledEvents.length > 0) {
      try {
        written = writeEvents(db, polledEvents);
      } catch (err) {
        const writeError = err instanceof Error ? err.message : String(err);
        adapterError = adapterError ? `${adapterError}; write: ${writeError}` : `write: ${writeError}`;
        errors.push(`[${adapter.name}] write failed: ${writeError}`);
      }
    }

    totalEventsWritten += written;
    adapterResults.push({
      adapter: adapter.name,
      category: adapter.category,
      eventsPolled: polledEvents.length,
      eventsWritten: written,
      error: adapterError,
    });
  }

  return { totalEventsWritten, errors, adapterResults, polledAt };
}
