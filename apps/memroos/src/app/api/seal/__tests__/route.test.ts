// @vitest-environment node
import Database from "better-sqlite3";
import { describe, expect, it, vi } from "vitest";

const testDb = new Database(":memory:");
const { initSchema } = await import("@/lib/db-schema");
const { persistEvalRun } = await import("@/lib/evals/persistence");
initSchema(testDb);

vi.mock("@/lib/db", () => ({
  getDb: () => testDb,
  closeDb: () => {},
}));

vi.mock("@/lib/auth/session", () => ({
  authenticateUser: async () => ({ userId: 'test-user', role: 'admin', email: 'admin@example.com', displayName: 'Admin', tenantId: 'default-tenant' }),
}));

const proposalsRoute = await import("../proposals/route");
const proposalRoute = await import("../proposals/[id]/route");
const auditRoute = await import("../audit/route");

function jsonRequest(url: string, body: Record<string, unknown>): Request {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function seedRun(id: string, traceId: string, compositeW: number) {
  persistEvalRun(testDb, {
    id,
    traceId,
    agentId: "agent-api",
    role: "ops",
    compositeW,
    trusted: true,
    layers: {
      l1: { score: compositeW, weight: 0.2, scorers: [] },
      l2: { score: compositeW, weight: 0.5, scorers: [] },
      l3: { score: compositeW, weight: 0.3, scorers: [] },
    },
    scorerResults: [],
    judge: {
      score: compositeW,
      rubricScores: { faithful: compositeW, useful: compositeW, policy: compositeW },
      model: "judge",
      provider: "local",
      modelFamily: "local",
      promptTemplateVersion: "v1",
      promptHash: "hash",
      positionBiasMitigation: { swapAugmentation: true, orderAgreement: true },
    },
    driftGuard: {
      status: "passed",
      agreement: 1,
      floor: 0.85,
      goldenSetVersion: "golden",
      examples: [],
    },
    configHash: "config",
    goldenSetPath: "./golden.jsonl",
    startedAt: "2026-05-15T00:00:00.000Z",
    completedAt: "2026-05-15T00:00:01.000Z",
  });
}

describe("SEAL API routes", () => {
  it("lists proposals, records approval decisions, and exposes read-only audit", async () => {
    seedRun("api-run-low", "api-trace-low", 0.41);

    const reflectResponse = await proposalsRoute.POST(
      jsonRequest("http://localhost/api/seal/proposals", {
        traceId: "api-trace-low",
        runId: "api-run-low",
      }) as any
    );
    const reflected = await reflectResponse.json();
    expect(reflectResponse.status).toBe(200);
    expect(reflected.proposals).toHaveLength(1);

    const listResponse = await proposalsRoute.GET(
      new Request("http://localhost/api/seal/proposals?status=pending") as any
    );
    const list = await listResponse.json();
    expect(list.proposals.some((proposal: { id: string }) => proposal.id === reflected.proposals[0].id)).toBe(true);

    const approveResponse = await proposalRoute.POST(
      jsonRequest(`http://localhost/api/seal/proposals/${reflected.proposals[0].id}`, {
        action: "approve",
        reasoning: "ready",
        operator: "test-user-id",
      }) as any,
      { params: Promise.resolve({ id: reflected.proposals[0].id }) } as any
    );
    const approved = await approveResponse.json();
    expect(approved.proposal.status).toBe("approved");

    const auditResponse = await auditRoute.GET(new Request("http://localhost/api/seal/audit") as any);
    const audit = await auditResponse.json();
    expect(audit.entries.some((entry: { event: string }) => entry.event === "approved")).toBe(true);
    expect("POST" in auditRoute).toBe(false);
    expect("PATCH" in auditRoute).toBe(false);
    expect("DELETE" in auditRoute).toBe(false);
  });
});
