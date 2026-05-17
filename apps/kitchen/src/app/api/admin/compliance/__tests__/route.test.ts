// @vitest-environment node
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { initSchema } from "@/lib/db-schema";

let testDb: Database.Database;
let sessionRole: "admin" | "operator" | "reviewer" | null = "admin";
const evalConfigPath = path.resolve(process.cwd(), "../../memroos.eval.yaml");
let originalEvalConfig = "";

vi.mock("@/lib/db", () => ({
  getDb: () => testDb,
  closeDb: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({
  authenticateUser: async () =>
    sessionRole
      ? {
          userId: "user-admin",
          role: sessionRole,
          email: "admin@example.com",
          displayName: "Admin",
          tenantId: "default-tenant",
        }
      : null,
}));

function makeDb(): Database.Database {
  const db = new Database(":memory:");
  initSchema(db);
  return db;
}

beforeAll(() => {
  originalEvalConfig = fs.readFileSync(evalConfigPath, "utf8");
});

beforeEach(() => {
  testDb = makeDb();
  sessionRole = "admin";
});

afterEach(() => {
  fs.writeFileSync(evalConfigPath, originalEvalConfig);
  testDb.close();
  vi.resetModules();
});

describe("/api/admin/compliance", () => {
  it("rejects non-admin users", async () => {
    sessionRole = "operator";
    const { GET } = await import("../route");

    const res = await GET(new Request("http://localhost/api/admin/compliance") as never);

    expect(res.status).toBe(403);
  });

  it("returns compliance posture for admins", async () => {
    const { GET } = await import("../route");

    const res = await GET(new Request("http://localhost/api/admin/compliance") as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.compliance).toHaveProperty("dataResidencyEnabled");
    expect(body.compliance).toHaveProperty("auditRetentionDays");
  });

  it("updates compliance controls and writes audit evidence", async () => {
    const { PUT } = await import("../route");
    const req = new Request("http://localhost/api/admin/compliance", {
      method: "PUT",
      body: JSON.stringify({
        dataResidencyEnabled: true,
        auditRetentionDays: 730,
        enabledAdapters: ["quickbooks", "bank_reconciliation"],
      }),
    });

    const res = await PUT(req as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.compliance.dataResidencyEnabled).toBe(true);
    expect(body.compliance.auditRetentionDays).toBe(730);
    expect(body.compliance.enabledAdapters).toEqual(["quickbooks", "bank_reconciliation"]);

    const audit = testDb
      .prepare("SELECT event_type, actor_id, entity_type FROM audit_entries")
      .get() as { event_type: string; actor_id: string; entity_type: string };
    expect(audit).toEqual({
      event_type: "admin.compliance_updated",
      actor_id: "user-admin",
      entity_type: "compliance_control",
    });
  });
});
