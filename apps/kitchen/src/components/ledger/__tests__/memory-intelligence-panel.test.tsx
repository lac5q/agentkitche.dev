import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-client", () => ({
  useMemoryStats: vi.fn(),
  useMemoryTierHealth: vi.fn(),
  useMemoryEvalLatest: vi.fn(),
}));

import { MemoryIntelligencePanel } from "../memory-intelligence-panel";
import { useMemoryEvalLatest, useMemoryStats, useMemoryTierHealth } from "@/lib/api-client";

const mockUseMemoryStats = vi.mocked(useMemoryStats);
const mockUseMemoryTierHealth = vi.mocked(useMemoryTierHealth);
const mockUseMemoryEvalLatest = vi.mocked(useMemoryEvalLatest);

function wrapper({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

describe("MemoryIntelligencePanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMemoryStats.mockReturnValue({
      data: {
        lastRun: null,
        pendingUnconsolidated: 0,
        tierStats: [],
        consolidationModel: "test-model",
        sources: [],
        timestamp: "2026-05-05T00:00:00.000Z",
      },
      isLoading: false,
    } as ReturnType<typeof useMemoryStats>);
    mockUseMemoryTierHealth.mockReturnValue({
      data: {
        tiers: [
          { tier: "vector", backend: "mem0-qdrant", status: "up" },
          { tier: "graph", backend: "neo4j", status: "up" },
          { tier: "episodic", backend: "sqlite", status: "up", count: 3 },
        ],
        timestamp: "2026-05-05T00:00:00.000Z",
      },
      isLoading: false,
    } as ReturnType<typeof useMemoryTierHealth>);
    mockUseMemoryEvalLatest.mockReturnValue({
      data: {
        ok: true,
        run: {
          id: "run-1",
          mode: "gold",
          status: "passed",
          startedAt: "2026-05-15T00:00:00.000Z",
          completedAt: "2026-05-15T00:01:00.000Z",
          summary: { totalCases: 12, passedCases: 11, failedCases: 1, passRate: 0.9167, p95LatencyMs: 1800, tierFailures: ["vector"] },
          results: [],
        },
        timestamp: "2026-05-15T00:01:00.000Z",
      },
      isLoading: false,
    } as ReturnType<typeof useMemoryEvalLatest>);
  });

  it("shows vector, graph, and episodic tier health", () => {
    render(<MemoryIntelligencePanel />, { wrapper });

    expect(screen.getByText("Tier Health")).toBeTruthy();
    expect(screen.getByText("mem0-qdrant")).toBeTruthy();
    expect(screen.getByText("neo4j")).toBeTruthy();
    expect(screen.getByText("sqlite")).toBeTruthy();
  });

  it("shows memory eval quality status separately from tier health", () => {
    render(<MemoryIntelligencePanel />, { wrapper });

    expect(screen.getByText("Recall Quality")).toBeTruthy();
    expect(screen.getByText("91.7%")).toBeTruthy();
    expect(screen.getByText("11/12 passing")).toBeTruthy();
    expect(screen.getAllByText("vector").length).toBeGreaterThan(1);
  });
});
