// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

const TEST_DB_DIR = path.join(os.tmpdir(), `a2a-route-${crypto.randomUUID()}`);
const TEST_DB_PATH = path.join(TEST_DB_DIR, "routes.db");

async function loadRoutes() {
  process.env.SQLITE_DB_PATH = TEST_DB_PATH;
  vi.resetModules();
  const messageSendRoute = await import("../../message:send/route");
  const messageStreamRoute = await import("../../message:stream/route");
  const tasksRoute = await import("../../tasks/route");
  const taskRoute = await import("../../tasks/[id]/route");
  const cancelRoute = await import("../../tasks/[id]:cancel/route");
  const subscribeRoute = await import("../../tasks/[id]:subscribe/route");
  const registry = await import("@/lib/agent-registry");
  const store = await import("@/lib/a2a/task-store");
  const dbModule = await import("@/lib/db");
  return {
    messageSendRoute,
    messageStreamRoute,
    tasksRoute,
    taskRoute,
    cancelRoute,
    subscribeRoute,
    ...registry,
    ...store,
    closeDb: dbModule.closeDb,
  };
}

function message(text = "hello") {
  return {
    messageId: crypto.randomUUID(),
    role: "user" as const,
    parts: [{ kind: "text" as const, text }],
  };
}

async function createAgentAndKey() {
  const routes = await loadRoutes();
  const { agent, apiKey } = routes.registerAgent({
    id: "caller-agent",
    name: "Caller Agent",
    role: "A2A caller",
    platform: "codex",
    protocol: "a2a",
    issueApiKey: true,
  });
  return { routes, agent, apiKey: apiKey! };
}

function postRequest(url: string, body: object, apiKey?: string) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

describe("A2A HTTP+JSON routes", () => {
  beforeEach(() => {
    fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  });

  afterEach(async () => {
    const { closeDb } = await loadRoutes();
    closeDb();
    fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
    delete process.env.SQLITE_DB_PATH;
  });

  it("rejects POST /message:send without bearer auth", async () => {
    const { messageSendRoute } = await loadRoutes();

    const response = await messageSendRoute.POST(
      postRequest("http://localhost/message:send", { message: message() })
    );

    expect(response.status).toBe(401);
  });

  it("accepts POST /message:send and returns a persisted task id", async () => {
    const { routes, apiKey } = await createAgentAndKey();

    const response = await routes.messageSendRoute.POST(
      postRequest("http://localhost/message:send", { message: message("send task") }, apiKey)
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBeTruthy();
    expect(routes.getA2aTask(body.id)?.task.id).toBe(body.id);
  });

  it("returns a task created by send from GET /tasks/{id}", async () => {
    const { routes, apiKey } = await createAgentAndKey();
    const sendResponse = await routes.messageSendRoute.POST(
      postRequest("http://localhost/message:send", { message: message("lookup task") }, apiKey)
    );
    const sent = await sendResponse.json();

    const response = await routes.taskRoute.GET(
      new Request(`http://localhost/tasks/${sent.id}`, {
        headers: { authorization: `Bearer ${apiKey}` },
      }),
      { params: Promise.resolve({ id: sent.id }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe(sent.id);
  });

  it("transitions a working task to canceled from POST /tasks/{id}:cancel", async () => {
    const { routes, apiKey } = await createAgentAndKey();
    const sendResponse = await routes.messageSendRoute.POST(
      postRequest("http://localhost/message:send", { message: message("cancel task") }, apiKey)
    );
    const sent = await sendResponse.json();
    routes.transitionA2aTask(sent.id, "working");

    const response = await routes.cancelRoute.POST(
      postRequest(`http://localhost/tasks/${sent.id}:cancel`, {}, apiKey),
      { params: Promise.resolve({ id: sent.id }) }
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status.state).toBe("canceled");
  });

  it("returns text/event-stream from POST /message:stream", async () => {
    const { routes, apiKey } = await createAgentAndKey();

    const response = await routes.messageStreamRoute.POST(
      postRequest("http://localhost/message:stream", { message: message("stream task") }, apiKey)
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(text).toContain("event: task.update");
  });

  it("returns text/event-stream from POST /tasks/{id}:subscribe for a permitted task", async () => {
    const { routes, apiKey } = await createAgentAndKey();
    const sendResponse = await routes.messageSendRoute.POST(
      postRequest("http://localhost/message:send", { message: message("subscribe task") }, apiKey)
    );
    const sent = await sendResponse.json();

    const response = await routes.subscribeRoute.POST(
      postRequest(`http://localhost/tasks/${sent.id}:subscribe`, {}, apiKey),
      { params: Promise.resolve({ id: sent.id }) }
    );
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(text).toContain("event: task.update");
  });
});
