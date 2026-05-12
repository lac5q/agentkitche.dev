// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/agent-registry", () => ({
  listRegisteredAgents: vi.fn(() => [
    {
      id: "research-agent",
      name: "Research Agent",
      role: "Research",
      platform: "gemini",
      protocol: "a2a",
      status: "active",
      capabilities: [{ id: "research", name: "Research", description: "", tags: ["analysis"] }],
      metadata: { a2a: { endpointUrl: "http://localhost:8001/a2a/research" } },
    },
  ]),
}));

function jsonRequest(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("orchestration API routes", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("rejects route requests without operator authorization", async () => {
    vi.stubEnv("KITCHEN_OPERATOR_API_KEY", "operator-secret");
    const { POST } = await import("../route");

    const response = await POST(jsonRequest("https://kitchen.example/api/orchestration", { taskSummary: "route me" }));

    expect(response.status).toBe(403);
  });

  it("posts canonical registry agents to the orchestration service", async () => {
    vi.stubEnv("KITCHEN_OPERATOR_API_KEY", "operator-secret");
    vi.stubEnv("ORCHESTRATION_SERVICE_URL", "http://localhost:3210");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, runId: "run-1", status: "dispatched", selectedAgentId: "research-agent" }))
    );
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("../route");

    const response = await POST(
      jsonRequest(
        "https://kitchen.example/api/orchestration",
        { taskSummary: "Research LangGraph", requiredCapability: "research", correlationId: "corr-route" },
        { authorization: "Bearer operator-secret" }
      )
    );
    const body = await response.json();
    const outbound = JSON.parse(fetchMock.mock.calls[0][1].body);

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: true, selectedAgentId: "research-agent" });
    expect(fetchMock.mock.calls[0][0]).toBe("http://localhost:3210/tasks/route");
    expect(outbound).toMatchObject({ taskSummary: "Research LangGraph", requiredCapability: "research", correlationId: "corr-route" });
    expect(outbound.agents[0]).toMatchObject({ id: "research-agent", protocol: "a2a" });
  });

  it("lists and resolves HIL decisions through the orchestration service", async () => {
    vi.stubEnv("KITCHEN_OPERATOR_API_KEY", "operator-secret");
    vi.stubEnv("ORCHESTRATION_SERVICE_URL", "http://localhost:3210");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, decisions: [{ id: "hil-1", status: "pending" }] })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, id: "hil-1", status: "approved" })));
    vi.stubGlobal("fetch", fetchMock);
    const hilRoute = await import("../hil/route");
    const decisionRoute = await import("../hil/[id]/route");

    const listResponse = await hilRoute.GET(
      new Request("https://kitchen.example/api/orchestration/hil", {
        headers: { authorization: "Bearer operator-secret" },
      })
    );
    const decideResponse = await decisionRoute.POST(
      jsonRequest("https://kitchen.example/api/orchestration/hil/hil-1", { decision: "approve" }, { authorization: "Bearer operator-secret" }),
      { params: Promise.resolve({ id: "hil-1" }) }
    );

    expect((await listResponse.json()).decisions).toHaveLength(1);
    expect(await decideResponse.json()).toMatchObject({ ok: true, status: "approved" });
    expect(fetchMock.mock.calls[1][0]).toBe("http://localhost:3210/hil/hil-1/resolve");
  });

  it("rejects HIL listing without operator authorization", async () => {
    vi.stubEnv("KITCHEN_OPERATOR_API_KEY", "operator-secret");
    const hilRoute = await import("../hil/route");

    const response = await hilRoute.GET(new Request("https://kitchen.example/api/orchestration/hil"));

    expect(response.status).toBe(403);
  });

  it("returns an empty unavailable queue when the HIL service is offline", async () => {
    vi.stubEnv("ORCHESTRATION_SERVICE_URL", "http://localhost:3210");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const hilRoute = await import("../hil/route");

    const response = await hilRoute.GET(new Request("http://localhost/api/orchestration/hil"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({ ok: false, decisions: [], status: "unavailable" });
  });
});
