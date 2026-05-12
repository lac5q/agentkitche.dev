// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import Database from "better-sqlite3";

const testDb = new Database(":memory:");
const { initSchema } = await import("@/lib/db-schema");
initSchema(testDb);

vi.mock("@/lib/db", () => ({
  getDb: () => testDb,
  closeDb: () => {},
}));

const { GET } = await import("../route");

function makeGetRequest(params: Record<string, string> = {}): Request {
  const url = new URL("http://localhost/api/security/report");
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return new Request(url.toString(), { method: "GET" });
}

describe("GET /api/security/report", () => {
  beforeEach(() => {
    testDb.prepare("DELETE FROM audit_log").run();
  });

  it("returns a clear posture when there are no security audit events", async () => {
    const res = await GET(makeGetRequest() as any);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.summary.status).toBe("clear");
    expect(data.summary.securityEvents).toBe(0);
    expect(data.controls.length).toBeGreaterThan(0);
  });

  it("includes recent audit activity when no security events match", async () => {
    testDb
      .prepare(
        `INSERT INTO audit_log(actor, action, target, detail, severity, timestamp)
         VALUES (@actor, @action, @target, @detail, @severity, @timestamp)`
      )
      .run({
        actor: "agent-a",
        action: "hive_action_write",
        target: "hive_actions",
        detail: "routine checkpoint",
        severity: "info",
        timestamp: "2026-01-01T00:00:00.000Z",
      });

    const res = await GET(makeGetRequest() as any);
    const data = await res.json();

    expect(data.summary.status).toBe("clear");
    expect(data.summary.securityEvents).toBe(0);
    expect(data.timeline).toHaveLength(0);
    expect(data.auditActivity).toHaveLength(1);
    expect(data.auditActivity[0]).toMatchObject({
      actor: "agent-a",
      action: "hive_action_write",
      target: "hive_actions",
    });
  });

  it("summarizes blocked policy events and redacts sensitive detail", async () => {
    testDb
      .prepare(
        `INSERT INTO audit_log(actor, action, target, detail, severity, timestamp)
         VALUES (@actor, @action, @target, @detail, @severity, @timestamp)`
      )
      .run({
        actor: "agent-a",
        action: "policy_denied",
        target: "dispatch",
        detail: "blocked Bearer abc123 and sk-test-secret",
        severity: "high",
        timestamp: "2026-01-01T00:00:00.000Z",
      });

    const res = await GET(makeGetRequest() as any);
    const data = await res.json();

    expect(data.summary.status).toBe("attention");
    expect(data.summary.blockedAttempts).toBe(1);
    expect(data.timeline[0].detail).not.toContain("abc123");
    expect(data.timeline[0].detail).not.toContain("sk-test-secret");
    expect(data.timeline[0].detail).toContain("[redacted]");
  });
});
