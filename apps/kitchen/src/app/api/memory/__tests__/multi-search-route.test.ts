// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/constants", () => ({
  CLAUDE_MEMORY_PATH: "/tmp/claude-memory.jsonl",
  MEM0_URL: "http://mem0.test",
}));

vi.mock("@/lib/parsers", () => ({
  parseClaudeMemory: vi.fn(),
}));

vi.mock("@/lib/memory/backends", () => ({
  searchVectorMemory: vi.fn(),
  queryGraphMemory: vi.fn(),
}));

async function loadRoute() {
  vi.resetModules();
  return import("../multi-search/route");
}

describe("multi memory search route", () => {
  beforeEach(async () => {
    const parsers = await import("@/lib/parsers");
    const backends = await import("@/lib/memory/backends");

    vi.mocked(parsers.parseClaudeMemory).mockResolvedValue([
      {
        id: "e1",
        content: "Product roadmap memory survives across sessions",
        agent: "claude",
        date: "2026-05-11",
        type: "project",
        source: "local",
      },
      {
        id: "e2",
        content: "Unrelated note",
        agent: "claude",
        date: "2026-05-10",
        type: "daily",
        source: "local",
      },
    ]);
    vi.mocked(backends.searchVectorMemory).mockResolvedValue({
      results: [{ id: "v1", memory: "Vector memory result", score: 0.87 }],
    });
    vi.mocked(backends.queryGraphMemory).mockResolvedValue({
      results: [
        {
          data: [
            {
              row: [
                { name: "Product", summary: "Graph memory result" },
                ["MENTIONS"],
                [{ name: "Roadmap" }],
              ],
            },
          ],
        },
      ],
    });
  });

  it("returns normalized vector, graph, and episodic search results", async () => {
    const { GET } = await loadRoute();

    const response = await GET(new Request("http://localhost/api/memory/multi-search?q=roadmap&limit=5"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.query).toBe("roadmap");
    expect(body.tiers.map((tier: { tier: string; ok: boolean }) => [tier.tier, tier.ok])).toEqual([
      ["vector", true],
      ["graph", true],
      ["episodic", true],
    ]);
    expect(body.results.map((result: { tier: string }) => result.tier)).toEqual([
      "vector",
      "graph",
      "episodic",
    ]);
    expect(body.results[2]).toMatchObject({
      tier: "episodic",
      title: "project memory",
      content: "Product roadmap memory survives across sessions",
    });
  });

  it("requires a query", async () => {
    const { GET } = await loadRoute();

    const response = await GET(new Request("http://localhost/api/memory/multi-search"));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ ok: false, error: "Query is required" });
  });
});
