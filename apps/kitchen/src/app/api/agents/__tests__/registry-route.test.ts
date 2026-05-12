// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

const TEST_DB_DIR = path.join(os.tmpdir(), `agents-route-${crypto.randomUUID()}`);
const TEST_DB_PATH = path.join(TEST_DB_DIR, "routes.db");

async function loadRoutes() {
  process.env.SQLITE_DB_PATH = TEST_DB_PATH;
  vi.resetModules();
  const agentsRoute = await import("../route");
  const registerRoute = await import("../register/route");
  const agentRoute = await import("../[id]/route");
  const heartbeatRoute = await import("../../heartbeat/route");
  const dbModule = await import("@/lib/db");
  return { agentsRoute, registerRoute, agentRoute, heartbeatRoute, getDb: dbModule.getDb, closeDb: dbModule.closeDb };
}

describe("agent registry routes", () => {
  beforeEach(() => {
    fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  });

  afterEach(async () => {
    const { closeDb } = await loadRoutes();
    closeDb();
    fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
    delete process.env.SQLITE_DB_PATH;
    delete process.env.KITCHEN_OPERATOR_API_KEY;
  });

  it("registers, lists, and deregisters canonical agents", async () => {
    const { agentsRoute, registerRoute, agentRoute } = await loadRoutes();

    const registerResponse = await registerRoute.POST(
      new Request("http://localhost/api/agents/register", {
        method: "POST",
        body: JSON.stringify({
          id: "route-agent",
          name: "Route Agent",
          role: "REST reporter",
          platform: "codex",
          protocol: "rest",
          capabilities: [{ id: "heartbeat", name: "Heartbeat", description: "", tags: [] }],
          issueApiKey: true,
        }),
      })
    );

    expect(registerResponse.status).toBe(200);
    const registered = await registerResponse.json();
    expect(registered.apiKey).toBeTruthy();
    expect(registered.agent.id).toBe("route-agent");

    const listResponse = await agentsRoute.GET();
    const listBody = await listResponse.json();
    expect(listBody.agents).toEqual([
      expect.objectContaining({ id: "route-agent", protocol: "rest" }),
    ]);
    expect(JSON.stringify(listBody.agents)).not.toContain(registered.apiKey);

    const deleteResponse = await agentRoute.DELETE(
      new Request("http://localhost/api/agents/route-agent"),
      { params: Promise.resolve({ id: "route-agent" }) }
    );
    expect(deleteResponse.status).toBe(200);

    const afterDelete = await agentsRoute.GET();
    expect((await afterDelete.json()).agents).toHaveLength(0);
  });

  it("registers then accepts a curl-like authenticated heartbeat", async () => {
    const { agentsRoute, registerRoute, heartbeatRoute } = await loadRoutes();

    const registerResponse = await registerRoute.POST(
      new Request("http://localhost/api/agents/register", {
        method: "POST",
        body: JSON.stringify({
          id: "curl-agent",
          name: "Curl Agent",
          role: "Non-A2A REST client",
          platform: "codex",
          protocol: "rest",
          issueApiKey: true,
        }),
      })
    );
    const registered = await registerResponse.json();

    const heartbeatResponse = await heartbeatRoute.POST(
      new Request("http://localhost/api/heartbeat", {
        method: "POST",
        headers: { authorization: `Bearer ${registered.apiKey}` },
        body: JSON.stringify({ status: "active", currentTask: "curl check-in" }),
      })
    );
    expect(heartbeatResponse.status).toBe(200);

    const listResponse = await agentsRoute.GET();
    const agents = (await listResponse.json()).agents;
    expect(agents[0]).toMatchObject({
      id: "curl-agent",
      protocol: "rest",
      status: "active",
      currentTask: "curl check-in",
    });
  });

  it("derives active status from recent hive activity", async () => {
    const { agentsRoute, registerRoute, getDb } = await loadRoutes();

    await registerRoute.POST(
      new Request("http://localhost/api/agents/register", {
        method: "POST",
        body: JSON.stringify({
          id: "alba",
          name: "Alba",
          role: "Coordinator",
          platform: "hermes",
          protocol: "rest",
          issueApiKey: false,
        }),
      })
    );

    getDb()
      .prepare(
        `INSERT INTO hive_actions(agent_id, action_type, summary, timestamp)
         VALUES ('alba', 'checkpoint', 'Recent checkpoint', ?)`
      )
      .run(new Date().toISOString());

    const listResponse = await agentsRoute.GET();
    const agents = (await listResponse.json()).agents;
    expect(agents[0]).toMatchObject({
      id: "alba",
      status: "active",
      currentTask: "Recent checkpoint",
      metadata: expect.objectContaining({ derivedActivity: "recent_hive_action" }),
    });
  });

  it("requires operator authorization for non-local registry writes", async () => {
    process.env.KITCHEN_OPERATOR_API_KEY = "operator-secret";
    const { agentsRoute, registerRoute, agentRoute } = await loadRoutes();

    const registrationBody = JSON.stringify({
      id: "remote-register-agent",
      name: "Remote Register Agent",
      role: "Attempts remote registration",
      platform: "codex",
      protocol: "rest",
      issueApiKey: true,
    });

    const rejectedRegister = await registerRoute.POST(
      new Request("https://kitchen.example.com/api/agents/register", {
        method: "POST",
        body: registrationBody,
      })
    );
    expect(rejectedRegister.status).toBe(403);

    const acceptedRegister = await registerRoute.POST(
      new Request("https://kitchen.example.com/api/agents/register", {
        method: "POST",
        headers: { "x-kitchen-operator-key": "operator-secret" },
        body: registrationBody,
      })
    );
    expect(acceptedRegister.status).toBe(200);

    const rejectedDelete = await agentRoute.DELETE(
      new Request("https://kitchen.example.com/api/agents/remote-register-agent", {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: "remote-register-agent" }) }
    );
    expect(rejectedDelete.status).toBe(403);
    expect((await (await agentsRoute.GET()).json()).agents).toHaveLength(1);

    const acceptedDelete = await agentRoute.DELETE(
      new Request("https://kitchen.example.com/api/agents/remote-register-agent", {
        method: "DELETE",
        headers: { "x-kitchen-operator-key": "operator-secret" },
      }),
      { params: Promise.resolve({ id: "remote-register-agent" }) }
    );
    expect(acceptedDelete.status).toBe(200);
    expect((await (await agentsRoute.GET()).json()).agents).toHaveLength(0);
  });

  it("accepts ChatGPT as a first-class registered agent platform", async () => {
    const { agentsRoute, registerRoute } = await loadRoutes();

    const registerResponse = await registerRoute.POST(
      new Request("http://localhost/api/agents/register", {
        method: "POST",
        body: JSON.stringify({
          id: "chatgpt",
          name: "ChatGPT",
          role: "Interactive planning and research agent",
          platform: "chatgpt",
          protocol: "rest",
          issueApiKey: false,
        }),
      })
    );

    expect(registerResponse.status).toBe(200);
    const listResponse = await agentsRoute.GET();
    expect((await listResponse.json()).agents).toEqual([
      expect.objectContaining({ id: "chatgpt", platform: "chatgpt" }),
    ]);
  });
});
