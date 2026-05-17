// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

const TEST_DB_DIR = path.join(os.tmpdir(), `agent-registry-${crypto.randomUUID()}`);
const TEST_DB_PATH = path.join(TEST_DB_DIR, "registry.db");

async function loadRegistry() {
  process.env.SQLITE_DB_PATH = TEST_DB_PATH;
  vi.resetModules();
  const dbModule = await import("../db");
  const registryModule = await import("../agent-registry");
  return { ...registryModule, closeDb: dbModule.closeDb, getDb: dbModule.getDb };
}

describe("agent registry service", () => {
  beforeEach(() => {
    fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  });

  afterEach(async () => {
    const { closeDb } = await loadRegistry();
    closeDb();
    fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
    delete process.env.SQLITE_DB_PATH;
  });

  it("registers an agent with capabilities and returns a one-time API key", async () => {
    const { registerAgent, getDb } = await loadRegistry();

    const result = registerAgent({
      id: "rest-cook",
      name: "Rest Cook",
      role: "REST integration agent",
      platform: "codex",
      protocol: "rest",
      capabilities: [
        { id: "memory.write", name: "Memory Write", description: "Writes memory", tags: ["memory"] },
      ],
      issueApiKey: true,
    });

    expect(result.apiKey).toBeTruthy();
    expect(result.agent).toMatchObject({
      id: "rest-cook",
      name: "Rest Cook",
      role: "REST integration agent",
      platform: "codex",
      protocol: "rest",
      status: "dormant",
    });
    expect(result.agent.capabilities).toHaveLength(1);

    const db = getDb();
    const keyRows = db.prepare("SELECT key_hash FROM agent_api_keys").all() as { key_hash: string }[];
    expect(keyRows).toHaveLength(1);
    expect(keyRows[0].key_hash).not.toBe(result.apiKey);
  });

  it("lists public registered agents without plaintext API keys", async () => {
    const { listRegisteredAgents, registerAgent } = await loadRegistry();

    registerAgent({
      id: "public-agent",
      name: "Public Agent",
      role: "Visible in registry",
      platform: "claude",
      protocol: "rest",
      issueApiKey: true,
    });

    const agents = listRegisteredAgents();
    expect(agents).toHaveLength(1);
    expect(agents[0].id).toBe("public-agent");
    expect(JSON.stringify(agents)).not.toContain("apiKey");
  });

  it("authenticates generated keys and rejects invalid keys", async () => {
    const { authenticateAgentKey, registerAgent } = await loadRegistry();

    const { apiKey } = registerAgent({
      id: "auth-agent",
      name: "Auth Agent",
      role: "Authenticated reporter",
      platform: "codex",
      protocol: "rest",
      issueApiKey: true,
    });

    expect(apiKey).toBeTruthy();
    const authenticated = authenticateAgentKey(apiKey!, "auth-agent");
    expect(authenticated?.id).toBe("auth-agent");
    expect(authenticateAgentKey("wrong-key", "auth-agent")).toBeNull();
    expect(authenticateAgentKey(apiKey!, "other-agent")).toBeNull();
  });

  it("records heartbeats against an existing agent", async () => {
    const { listRegisteredAgents, recordHeartbeat, registerAgent } = await loadRegistry();

    registerAgent({
      id: "heartbeat-agent",
      name: "Heartbeat Agent",
      role: "Reports liveness",
      platform: "opencode",
      protocol: "rest",
    });

    recordHeartbeat("heartbeat-agent", {
      status: "active",
      currentTask: "checking in",
      metadata: { pid: 1234 },
    });

    const [agent] = listRegisteredAgents();
    expect(agent.status).toBe("active");
    expect(agent.lastHeartbeat).toBeTruthy();
    expect(agent.currentTask).toBe("checking in");
    expect(agent.metadata).toMatchObject({ pid: 1234 });
  });

  it("deregisters agents by soft delete and revokes keys", async () => {
    const { authenticateAgentKey, deregisterAgent, listRegisteredAgents, registerAgent } =
      await loadRegistry();

    const { apiKey } = registerAgent({
      id: "retiring-agent",
      name: "Retiring Agent",
      role: "Will be deregistered",
      platform: "gemini",
      protocol: "rest",
      issueApiKey: true,
    });

    deregisterAgent("retiring-agent");

    expect(listRegisteredAgents()).toHaveLength(0);
    expect(listRegisteredAgents({ includeDeregistered: true })[0].deregisteredAt).toBeTruthy();
    expect(authenticateAgentKey(apiKey!, "retiring-agent")).toBeNull();
  });

  it("maps remote-capable registered agents to RemoteAgentConfig compatibility shape", async () => {
    const { getRemoteAgents, registerAgent } = await loadRegistry();

    registerAgent({
      id: "remote-agent",
      name: "Remote Agent",
      role: "Remote worker",
      platform: "claude",
      protocol: "rest",
      location: "tailscale",
      host: "agent.tailnet",
      port: 3100,
      healthEndpoint: "/health",
      capabilities: [
        { id: "dispatch", name: "Dispatch", description: "Accepts delegated tasks", tags: [] },
      ],
    });

    expect(getRemoteAgents()).toEqual([
      expect.objectContaining({
        id: "remote-agent",
        name: "Remote Agent",
        location: "tailscale",
        host: "agent.tailnet",
        port: 3100,
        healthEndpoint: "/health",
      }),
    ]);
  });
});
