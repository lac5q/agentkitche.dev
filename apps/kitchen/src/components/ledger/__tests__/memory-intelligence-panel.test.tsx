import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-client", () => ({
  useMemoryStats: vi.fn(),
  useMemoryTierHealth: vi.fn(),
}));

import { MemoryIntelligencePanel } from "../memory-intelligence-panel";
import { useMemoryStats, useMemoryTierHealth } from "@/lib/api-client";

const mockUseMemoryStats = vi.mocked(useMemoryStats);
const mockUseMemoryTierHealth = vi.mocked(useMemoryTierHealth);

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
  });

  it("shows vector, graph, and episodic tier health", () => {
    render(<MemoryIntelligencePanel />, { wrapper });

    expect(screen.getByText("Tier Health")).toBeTruthy();
    expect(screen.getByText("mem0-qdrant")).toBeTruthy();
    expect(screen.getByText("neo4j")).toBeTruthy();
    expect(screen.getByText("sqlite")).toBeTruthy();
  });
});
