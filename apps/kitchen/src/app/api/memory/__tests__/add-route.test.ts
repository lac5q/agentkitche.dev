// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

const TEST_DB_DIR = path.join(os.tmpdir(), `memory-add-${crypto.randomUUID()}`);
const TEST_DB_PATH = path.join(TEST_DB_DIR, "routes.db");

async function loadRoute() {
  process.env.SQLITE_DB_PATH = TEST_DB_PATH;
  process.env.MEM0_URL = "http://mem0.test";
  vi.resetModules();
  const registry = await import("@/lib/agent-registry");
  const route = await import("../add/route");
  const dbModule = await import("@/lib/db");
  return { ...registry, ...route, closeDb: dbModule.closeDb, getDb: dbModule.getDb };
}

describe("POST /api/memory/add", () => {
  beforeEach(() => {
    fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({ ok: true, id: "mem-1" }))
    );
  });

  afterEach(async () => {
    const { closeDb } = await loadRoute();
    closeDb();
    vi.unstubAllGlobals();
    fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
    delete process.env.SQLITE_DB_PATH;
    delete process.env.MEM0_URL;
  });

  it("rejects missing, invalid, and body-only agent identity", async () => {
    const { POST, registerAgent } = await loadRoute();
    registerAgent({
      id: "memory-agent",
      name: "Memory Agent",
      role: "Writes memory",
      platform: "codex",
      protocol: "rest",
      issueApiKey: true,
    });

    const body = JSON.stringify({ agentId: "memory-agent", content: "remember this" });
    expect((await POST(new Request("http://localhost/api/memory/add", { method: "POST", body }))).status).toBe(401);
    expect(
      (
        await POST(
          new Request("http://localhost/api/memory/add", {
            method: "POST",
            headers: { authorization: "Bearer nope" },
            body,
          })
        )
      ).status
    ).toBe(401);
  });

  it("forwards valid memory writes to mem0 and audits the write", async () => {
    const { POST, getDb, registerAgent } = await loadRoute();
    const { apiKey } = registerAgent({
      id: "memory-agent",
      name: "Memory Agent",
      role: "Writes memory",
      platform: "codex",
      protocol: "rest",
      issueApiKey: true,
    });

    const res = await POST(
      new Request("http://localhost/api/memory/add", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ content: "remember this", type: "episodic", metadata: { source: "test" } }),
      })
    );

    expect(res.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith(
      "http://mem0.test/memory/add",
      expect.objectContaining({ method: "POST" })
    );
    const rows = getDb().prepare("SELECT agent_id, memory_type FROM agent_memory_writes").all();
    expect(rows).toEqual([{ agent_id: "memory-agent", memory_type: "episodic" }]);
  });

  it("returns a safe 502 when mem0 is unreachable", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("connection refused"));
    const { POST, getDb, registerAgent } = await loadRoute();
    const { apiKey } = registerAgent({
      id: "memory-agent",
      name: "Memory Agent",
      role: "Writes memory",
      platform: "codex",
      protocol: "rest",
      issueApiKey: true,
    });

    const res = await POST(
      new Request("http://localhost/api/memory/add", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ content: "remember this", type: "episodic" }),
      })
    );

    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: "Memory backend unavailable" });
    const rows = getDb().prepare("SELECT agent_id FROM agent_memory_writes").all();
    expect(rows).toEqual([]);
  });
});
