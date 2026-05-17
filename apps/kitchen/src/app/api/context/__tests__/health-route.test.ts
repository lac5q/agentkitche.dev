// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/context-sources", () => ({
  loadContextSourceContracts: () => ({
    sources: [{
      id: "spark",
      type: "spark",
      enabled: true,
      requiredTools: [],
      envVars: [],
      sourcePath: "./spark",
      ingestCommand: "spark ingest",
      indexCommand: null,
      freshnessThresholdMinutes: 60,
      qmdCollection: "spark",
      safeAnswerPolicy: "source_required",
    }],
  }),
  evaluateContextSources: () => ({
    sources: [{ id: "spark", type: "spark", status: "ok", enabled: true }],
    timestamp: "2026-05-17T12:00:00.000Z",
  }),
}));

describe("GET /api/context/health", () => {
  it("returns context source health", async () => {
    const { GET } = await import("../health/route");
    const res = GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.sources).toEqual([expect.objectContaining({ id: "spark", status: "ok" })]);
  });
});
