// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

const TEST_DB_DIR = path.join(os.tmpdir(), `skills-report-${crypto.randomUUID()}`);
const TEST_DB_PATH = path.join(TEST_DB_DIR, "routes.db");

async function loadRoute() {
  process.env.SQLITE_DB_PATH = TEST_DB_PATH;
  vi.resetModules();
  const registry = await import("@/lib/agent-registry");
  const route = await import("../report/route");
  const dbModule = await import("@/lib/db");
  return { ...registry, ...route, closeDb: dbModule.closeDb, getDb: dbModule.getDb };
}

describe("POST /api/skills/report", () => {
  beforeEach(() => {
    fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  });

  afterEach(async () => {
    const { closeDb } = await loadRoute();
    closeDb();
    fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
    delete process.env.SQLITE_DB_PATH;
  });

  it("rejects missing, invalid, and body-only agent identity", async () => {
    const { POST, registerAgent } = await loadRoute();
    registerAgent({
      id: "skill-agent",
      name: "Skill Agent",
      role: "Reports skills",
      platform: "codex",
      protocol: "rest",
      issueApiKey: true,
    });

    const body = JSON.stringify({ agentId: "skill-agent", skillId: "test", action: "used" });
    expect((await POST(new Request("http://localhost/api/skills/report", { method: "POST", body }))).status).toBe(401);
    expect(
      (
        await POST(
          new Request("http://localhost/api/skills/report", {
            method: "POST",
            headers: { authorization: "Bearer nope" },
            body,
          })
        )
      ).status
    ).toBe(401);
  });

  it("records a valid authenticated skill report", async () => {
    const { POST, getDb, registerAgent } = await loadRoute();
    const { apiKey } = registerAgent({
      id: "skill-agent",
      name: "Skill Agent",
      role: "Reports skills",
      platform: "codex",
      protocol: "rest",
      issueApiKey: true,
    });

    const res = await POST(
      new Request("http://localhost/api/skills/report", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ skillId: "skill:test", action: "used", metadata: { ok: true } }),
      })
    );

    expect(res.status).toBe(200);
    const rows = getDb().prepare("SELECT agent_id, skill_id, action FROM agent_skill_reports").all();
    expect(rows).toEqual([{ agent_id: "skill-agent", skill_id: "skill:test", action: "used" }]);
  });
});
