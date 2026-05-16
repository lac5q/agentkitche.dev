// @vitest-environment node
import Database from "better-sqlite3";
import { describe, expect, it, vi } from "vitest";

const testDb = new Database(":memory:");
const { initSchema } = await import("@/lib/db-schema");
initSchema(testDb);

vi.mock("@/lib/db", () => ({
  getDb: () => testDb,
  closeDb: () => {},
}));

const configRoute = await import("../config/route");
const runRoute = await import("../run/route");
const historyRoute = await import("../history/route");

function jsonRequest(url: string, body: Record<string, unknown>): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("eval engine APIs", () => {
  it("returns and updates the eval config source of truth", async () => {
    const getResponse = await configRoute.GET();
    const initial = await getResponse.json();
    expect(initial.config.judgeModel.model).toBe("claude-haiku-4-5-20251001");

    const putResponse = await configRoute.PUT(
      jsonRequest("http://localhost/api/evals/config", {
        config: {
          ...initial.config,
          weights: { l1: 0.25, l2: 0.5, l3: 0.25 },
        },
      }) as any
    );
    const updated = await putResponse.json();
    expect(updated.config.weights).toEqual({ l1: 0.25, l2: 0.5, l3: 0.25 });
  });

  it("scores and persists an agent trace through the run API", async () => {
    const response = await runRoute.POST(
      jsonRequest("http://localhost/api/evals/run", {
        trace: {
          traceId: "api-trace",
          agentId: "codex",
          agentModelFamily: "openai",
          role: "engineering",
          input: "Resolve support task",
          output: "resolved with memory before plan",
          expectedFacts: ["resolved"],
          toolCalls: [{ name: "memory.search", valid: true }],
          memory: {
            expectedFacts: ["support context"],
            retrievedFacts: ["support context"],
            recallAtK: 1,
            precisionAtK: 1,
            mrr: 1,
          },
          outcome: { completed: true, escalated: false, operatorApproved: true, ttrMs: 1000, costUsd: 0.1 },
        },
      }) as any
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.result.compositeW).toBeGreaterThan(0);
    expect(data.result.layers.l1.scorers.length).toBeGreaterThan(0);

    const historyResponse = await historyRoute.GET(new Request("http://localhost/api/evals/history?limit=10") as any);
    const history = await historyResponse.json();
    expect(history.runs.some((run: { traceId: string }) => run.traceId === "api-trace")).toBe(true);
  });
});
