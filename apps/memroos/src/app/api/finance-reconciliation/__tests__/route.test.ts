// @vitest-environment node
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initSchema } from "@/lib/db-schema";

let testDb: Database.Database;

vi.mock("@/lib/db", () => ({
  getDb: () => testDb,
  closeDb: vi.fn(),
}));

vi.mock("@/lib/operator-auth", () => ({
  authorizeRegistryWrite: () => true,
  registryWriteUnauthorizedResponse: () => Response.json({ error: "unauthorized" }, { status: 401 }),
}));

function makeDb(): Database.Database {
  const db = new Database(":memory:");
  initSchema(db);
  return db;
}

beforeEach(() => {
  testDb = makeDb();
});

afterEach(() => {
  testDb.close();
});

describe("POST /api/finance-reconciliation", () => {
  it("processes the demo mode and returns reconciliation summary counts", async () => {
    const { POST } = await import("../route");
    const req = new Request("http://localhost/api/finance-reconciliation", {
      method: "POST",
      body: JSON.stringify({ mode: "demo", count: 100 }),
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.summary.processed).toBe(100);
    expect(body.summary.auditEntries).toBe(100);
    expect(body.summary.hilEscalations).toBe(body.summary.escalated);
  });

  it("processes uploaded CSV payloads", async () => {
    const { POST } = await import("../route");
    const csv = [
      "transaction_id,correlation_id,amount,expected_amount,status,confidence,reason",
      "txn-route,corr-route,10,12,mismatched,0.4,needs review",
    ].join("\n");
    const req = new Request("http://localhost/api/finance-reconciliation", {
      method: "POST",
      body: JSON.stringify({ mode: "csv", csv }),
    });

    const res = await POST(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.summary.processed).toBe(1);
    expect(body.summary.mismatched).toBe(1);
    expect(body.summary.hilEscalations).toBe(1);
  });
});
