import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { MemroosClient, MemroosApiError } from "../client";
import type { AgentEvalTrace, EvalSubmitResult, EvalRunResult, SealProposal } from "../types";

const BASE_URL = "http://localhost:3000";
const API_KEY = "test-api-key-abc123";

function mockFetch(data: unknown, status = 200): ReturnType<typeof vi.fn> {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: () => Promise.resolve(data),
  });
}

const sampleTrace: AgentEvalTrace = {
  traceId: "trace-unit-001",
  agentId: "test-agent",
  input: "What is the refund policy?",
  output: "Refunds are accepted within 30 days.",
};

const sampleSubmitResult: EvalSubmitResult = {
  runId: "run-001",
  w: 0.78,
  layers: {
    l1: { score: 0.9, weight: 0.25, scorers: [] },
    l2: { score: 0.8, weight: 0.5, scorers: [] },
    l3: { score: 0.6, weight: 0.25, scorers: [] },
  },
  proposalIds: [],
  tenantId: "default-tenant",
};

describe("MemroosClient", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── submitTrace ──────────────────────────────────────────────────────────────

  it("submitTrace sends POST to /api/public/v1/traces with the trace body", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(sampleSubmitResult),
    });

    const client = new MemroosClient({ baseUrl: BASE_URL, apiKey: API_KEY });
    const result = await client.submitTrace(sampleTrace);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [calledUrl, calledInit] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe("http://localhost:3000/api/public/v1/traces");
    expect(calledInit.method).toBe("POST");
    expect(calledInit.headers).toMatchObject({
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    });
    expect(JSON.parse(calledInit.body as string)).toEqual(sampleTrace);
    expect(result.runId).toBe("run-001");
    expect(result.w).toBe(0.78);
  });

  it("submitTrace parses and returns the typed EvalSubmitResult", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(sampleSubmitResult),
    });

    const client = new MemroosClient({ baseUrl: BASE_URL, apiKey: API_KEY });
    const result = await client.submitTrace(sampleTrace);

    expect(result.runId).toBeTypeOf("string");
    expect(result.w).toBeTypeOf("number");
    expect(result.layers).toHaveProperty("l1");
    expect(result.layers).toHaveProperty("l2");
    expect(result.layers).toHaveProperty("l3");
    expect(Array.isArray(result.proposalIds)).toBe(true);
  });

  it("submitTrace throws MemroosApiError on 401", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: () => Promise.resolve({ error: "Unauthorized" }),
    });

    const client = new MemroosClient({ baseUrl: BASE_URL, apiKey: "bad-key" });
    await expect(client.submitTrace(sampleTrace)).rejects.toBeInstanceOf(MemroosApiError);
  });

  it("submitTrace throws MemroosApiError with correct status on 429", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 429,
      statusText: "Too Many Requests",
      json: () => Promise.resolve({ error: "Too Many Requests" }),
    });

    const client = new MemroosClient({ baseUrl: BASE_URL, apiKey: API_KEY });
    let thrown: MemroosApiError | null = null;
    try {
      await client.submitTrace(sampleTrace);
    } catch (err) {
      if (err instanceof MemroosApiError) thrown = err;
    }
    expect(thrown).not.toBeNull();
    expect(thrown!.status).toBe(429);
  });

  // ── getRunResult ─────────────────────────────────────────────────────────────

  it("getRunResult sends GET to /api/public/v1/runs/:runId", async () => {
    const mockRun: Partial<EvalRunResult> = {
      id: "run-001",
      compositeW: 0.78,
      traceId: "trace-001",
      agentId: "test-agent",
    };
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ run: mockRun }),
    });

    const client = new MemroosClient({ baseUrl: BASE_URL, apiKey: API_KEY });
    const run = await client.getRunResult("run-001");

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [calledUrl] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe("http://localhost:3000/api/public/v1/runs/run-001");
    expect(run.id).toBe("run-001");
    expect(run.compositeW).toBe(0.78);
  });

  it("getRunResult throws MemroosApiError on 404", async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: () => Promise.resolve({ error: "Run not found" }),
    });

    const client = new MemroosClient({ baseUrl: BASE_URL, apiKey: API_KEY });
    await expect(client.getRunResult("unknown-run")).rejects.toBeInstanceOf(MemroosApiError);
  });

  // ── listProposals ─────────────────────────────────────────────────────────────

  it("listProposals sends GET to /api/public/v1/proposals", async () => {
    const mockProposals: SealProposal[] = [
      { id: "p-001", proposalType: "noop_test", status: "pending", forecastWDelta: 0.05, createdAt: "2026-01-01T00:00:00Z" },
    ];
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ proposals: mockProposals }),
    });

    const client = new MemroosClient({ baseUrl: BASE_URL, apiKey: API_KEY });
    const proposals = await client.listProposals();

    const [calledUrl] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe("http://localhost:3000/api/public/v1/proposals");
    expect(proposals).toHaveLength(1);
    expect(proposals[0]!.id).toBe("p-001");
  });

  it("listProposals appends traceId query param when filter is provided", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ proposals: [] }),
    });

    const client = new MemroosClient({ baseUrl: BASE_URL, apiKey: API_KEY });
    await client.listProposals({ traceId: "trace-abc" });

    const [calledUrl] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toContain("traceId=trace-abc");
  });

  // ── base URL normalization ────────────────────────────────────────────────────

  it("strips trailing slash from baseUrl", async () => {
    fetchSpy.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(sampleSubmitResult),
    });

    const client = new MemroosClient({ baseUrl: "http://localhost:3000/", apiKey: API_KEY });
    await client.submitTrace(sampleTrace);

    const [calledUrl] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(calledUrl).toBe("http://localhost:3000/api/public/v1/traces");
  });
});
