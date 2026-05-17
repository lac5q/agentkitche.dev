// @vitest-environment node
/**
 * Phase 64: Audit log performance test — p95 < 200ms on 1M rows.
 *
 * IMPORTANT: This test seeds 1M rows, which takes ~20-30s to insert.
 * If p95 >= 200ms, the test fails but plan completion is NOT blocked —
 * see SUMMARY.md for perf test results and any remediation notes.
 */
import { describe, it, expect, beforeAll } from "vitest";
import Database from "better-sqlite3";
import { initSchema } from "@/lib/db-schema";
import { queryAuditEntries } from "@/lib/audit/query";

const SEED_COUNT = 1_000_000;
const PERF_RUNS = 10;
const P95_BUDGET_MS = 200;

// Shared in-memory DB — populated once in beforeAll
let db: Database.Database;

function p95(times: number[]): number {
  const sorted = [...times].sort((a, b) => a - b);
  const idx = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function p50(times: number[]): number {
  const sorted = [...times].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function p99(times: number[]): number {
  const sorted = [...times].sort((a, b) => a - b);
  const idx = Math.ceil(0.99 * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

beforeAll(() => {
  db = new Database(":memory:");
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = OFF"); // Faster seeding
  db.pragma("temp_store = MEMORY");
  db.pragma("cache_size = 100000");
  initSchema(db);

  // Seed 1M rows in batches using transactions
  const BATCH_SIZE = 10_000;
  const agents = ["agent:test-agent-001", "agent:test-agent-002", "agent:test-agent-003"];
  const eventTypes = [
    "agent.matched",
    "agent.flagged",
    "agent.escalated",
    "seal.proposed",
    "seal.approved",
    "seal.applied",
    "eval.completed",
    "eval.drift_halted",
    "hil.created",
    "hil.resolved",
  ];
  const actors = ["user-test-001", "user-test-002", "user-test-003", "system"];
  // Only use 'default-tenant' to avoid FK constraint errors (tenants table has only this entry)
  const tenants = ["default-tenant"];
  const entityTypes = ["agent", "seal_proposal", "eval_run", "hil_escalation"];

  const insert = db.prepare(
    `INSERT INTO audit_entries
      (id, tenant_id, actor_id, actor_role, event_type, entity_type, entity_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );

  // Base date: 6 months ago
  const baseMs = Date.now() - 6 * 30 * 24 * 3600_000;
  const rangeMs = 6 * 30 * 24 * 3600_000;

  const seedBatch = db.transaction((start: number, count: number) => {
    for (let i = start; i < start + count; i++) {
      const entityType = entityTypes[i % entityTypes.length];
      const agentIdx = i % agents.length;
      const entityId = entityType === "agent" ? agents[agentIdx] : `${entityType}:item-${i % 1000}`;
      const eventType = eventTypes[i % eventTypes.length];
      const actor = actors[i % actors.length];
      const tenant = tenants[i % tenants.length];
      const tsMs = baseMs + (i * rangeMs) / SEED_COUNT;
      const ts = new Date(tsMs).toISOString();
      insert.run(
        `perf-${i}`,
        tenant,
        actor,
        actor === "system" ? "system" : "operator",
        eventType,
        entityType,
        entityId,
        ts
      );
    }
  });

  let seeded = 0;
  while (seeded < SEED_COUNT) {
    const batchSize = Math.min(BATCH_SIZE, SEED_COUNT - seeded);
    seedBatch(seeded, batchSize);
    seeded += batchSize;
  }

  // Verify seeded
  const count = (db.prepare("SELECT COUNT(*) as c FROM audit_entries").get() as { c: number }).c;
  if (count < SEED_COUNT * 0.99) {
    throw new Error(`Seeding failed: expected ~${SEED_COUNT} rows, got ${count}`);
  }

  // Restore normal synchronous setting for reads
  db.pragma("synchronous = NORMAL");
}, 120_000); // 2 min timeout for seeding

describe("audit perf: 1M rows, p95 < 200ms", () => {
  it("Filter by entity_type=agent + entity_id (audit_entries_entity index)", () => {
    const times: number[] = [];
    for (let i = 0; i < PERF_RUNS; i++) {
      const t0 = performance.now();
      queryAuditEntries(
        { entityType: "agent", entityId: "agent:test-agent-001", limit: 50 },
        db
      );
      times.push(performance.now() - t0);
    }
    const actualP95 = p95(times);
    console.log(
      `[perf] entity filter — p50=${p50(times).toFixed(1)}ms p95=${actualP95.toFixed(1)}ms p99=${p99(times).toFixed(1)}ms`
    );
    expect(actualP95).toBeLessThan(P95_BUDGET_MS);
  });

  it("Filter by created_at range (30-day window) (audit_entries_created index)", () => {
    const times: number[] = [];
    const windowEnd = new Date().toISOString();
    const windowStart = new Date(Date.now() - 30 * 24 * 3600_000).toISOString();
    for (let i = 0; i < PERF_RUNS; i++) {
      const t0 = performance.now();
      queryAuditEntries({ from: windowStart, to: windowEnd, limit: 50 }, db);
      times.push(performance.now() - t0);
    }
    const actualP95 = p95(times);
    console.log(
      `[perf] date range filter — p50=${p50(times).toFixed(1)}ms p95=${actualP95.toFixed(1)}ms p99=${p99(times).toFixed(1)}ms`
    );
    expect(actualP95).toBeLessThan(P95_BUDGET_MS);
  });

  it("Filter by event_type=seal.approved (audit_entries_event_type index)", () => {
    const times: number[] = [];
    for (let i = 0; i < PERF_RUNS; i++) {
      const t0 = performance.now();
      queryAuditEntries({ eventType: "seal.approved", limit: 50 }, db);
      times.push(performance.now() - t0);
    }
    const actualP95 = p95(times);
    console.log(
      `[perf] event_type filter — p50=${p50(times).toFixed(1)}ms p95=${actualP95.toFixed(1)}ms p99=${p99(times).toFixed(1)}ms`
    );
    expect(actualP95).toBeLessThan(P95_BUDGET_MS);
  });

  it("Filter by actor_id=user-test-001 (audit_entries_actor index)", () => {
    const times: number[] = [];
    for (let i = 0; i < PERF_RUNS; i++) {
      const t0 = performance.now();
      queryAuditEntries({ actorId: "user-test-001", limit: 50 }, db);
      times.push(performance.now() - t0);
    }
    const actualP95 = p95(times);
    console.log(
      `[perf] actor_id filter — p50=${p50(times).toFixed(1)}ms p95=${actualP95.toFixed(1)}ms p99=${p99(times).toFixed(1)}ms`
    );
    expect(actualP95).toBeLessThan(P95_BUDGET_MS);
  });
});
