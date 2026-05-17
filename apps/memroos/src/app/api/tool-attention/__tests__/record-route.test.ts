// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

const TEST_DIR = path.join(os.tmpdir(), `tool-record-${crypto.randomUUID()}`);
const TEST_DB_PATH = path.join(TEST_DIR, "routes.db");
const TEST_OUTCOMES_PATH = path.join(TEST_DIR, "outcomes.jsonl");

async function loadRoute() {
  process.env.SQLITE_DB_PATH = TEST_DB_PATH;
  process.env.TOOL_ATTENTION_OUTCOMES = TEST_OUTCOMES_PATH;
  vi.resetModules();
  const registry = await import("@/lib/agent-registry");
  const route = await import("../record/route");
  const dbModule = await import("@/lib/db");
  return { ...registry, ...route, closeDb: dbModule.closeDb, getDb: dbModule.getDb };
}

describe("POST /api/tool-attention/record", () => {
  beforeEach(() => {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    const { closeDb } = await loadRoute();
    closeDb();
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
    delete process.env.SQLITE_DB_PATH;
    delete process.env.TOOL_ATTENTION_OUTCOMES;
  });

  it("rejects missing, invalid, and body-only agent identity", async () => {
    const { POST, registerAgent } = await loadRoute();
    registerAgent({
      id: "tool-agent",
      name: "Tool Agent",
      role: "Records tools",
      platform: "codex",
      protocol: "rest",
      issueApiKey: true,
    });

    const body = JSON.stringify({ agentId: "tool-agent", toolId: "tool:x", outcome: "helped" });
    expect((await POST(new Request("http://localhost/api/tool-attention/record", { method: "POST", body }))).status).toBe(401);
    expect(
      (
        await POST(
          new Request("http://localhost/api/tool-attention/record", {
            method: "POST",
            headers: { authorization: "Bearer nope" },
            body,
          })
        )
      ).status
    ).toBe(401);
  });

  it("records valid authenticated tool outcomes to JSONL and audit table", async () => {
    const { POST, getDb, registerAgent } = await loadRoute();
    const { apiKey } = registerAgent({
      id: "tool-agent",
      name: "Tool Agent",
      role: "Records tools",
      platform: "codex",
      protocol: "rest",
      issueApiKey: true,
    });

    const res = await POST(
      new Request("http://localhost/api/tool-attention/record", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ toolId: "skill:test", task: "no raw echo", outcome: "helped", metadata: { repo: "memroos" } }),
      })
    );

    expect(res.status).toBe(200);
    const jsonl = fs.readFileSync(TEST_OUTCOMES_PATH, "utf-8").trim();
    expect(JSON.parse(jsonl)).toMatchObject({
      toolId: "skill:test",
      outcome: "helped",
      metadata: expect.objectContaining({ agent_id: "tool-agent", repo: "memroos" }),
    });
    const rows = getDb().prepare("SELECT agent_id, tool_id, outcome FROM agent_tool_outcomes").all();
    expect(rows).toEqual([{ agent_id: "tool-agent", tool_id: "skill:test", outcome: "helped" }]);
  });
});
