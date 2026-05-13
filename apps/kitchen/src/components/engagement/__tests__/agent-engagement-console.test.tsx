import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";

vi.mock("@/components/dispatch/lineage-drawer", () => ({
  LineageDrawer: ({ taskId }: { taskId: string }) => <button type="button">Timeline {taskId}</button>,
}));

const mockRefetchDelegations = vi.fn();
const mockAgents = [
  {
    id: "claude-sonnet-engineer",
    name: "Claude Sonnet Engineer",
    role: "CLI engineer",
    platform: "claude",
    protocol: "local",
    status: "active",
    lastHeartbeat: null,
    currentTask: null,
    lessonsCount: 0,
    todayMemoryCount: 0,
    location: "local",
    isRemote: false,
    latencyMs: null,
    capabilities: [],
    metadata: {},
    host: null,
    port: null,
    healthEndpoint: null,
    tunnelUrl: null,
    createdAt: "2026-05-11T00:00:00Z",
    updatedAt: "2026-05-11T00:00:00Z",
    deregisteredAt: null,
  },
  {
    id: "codex-cli-agent",
    name: "Codex CLI",
    role: "Agent",
    platform: "codex",
    protocol: "local",
    status: "idle",
    lastHeartbeat: null,
    currentTask: null,
    lessonsCount: 0,
    todayMemoryCount: 0,
    location: "local",
    isRemote: false,
    latencyMs: null,
    capabilities: [],
    metadata: {},
    host: null,
    port: null,
    healthEndpoint: null,
    tunnelUrl: null,
    createdAt: "2026-05-11T00:00:00Z",
    updatedAt: "2026-05-11T00:00:00Z",
    deregisteredAt: null,
  },
];

vi.mock("@/lib/api-client", () => ({
  useAgents: () => ({ data: { agents: mockAgents }, isLoading: false }),
  useDelegations: () => ({
    data: {
      delegations: [{
        task_id: "t1",
        task_summary: "existing task",
        status: "pending",
      }],
    },
    refetch: mockRefetchDelegations,
  }),
}));

import { AgentEngagementConsole } from "../agent-engagement-console";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
});

describe("AgentEngagementConsole", () => {
  it("renders the centralized engagement modes", () => {
    render(<AgentEngagementConsole />);

    expect(screen.getByText("Agent Engagement")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Chat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Voice" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Standup" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Conference" })).toBeInTheDocument();
    expect(screen.getAllByText("Claude Sonnet Engineer").length).toBeGreaterThan(0);
  });

  it("runs diagnostics for active agents", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: async () => ({
        results: [{
          agentId: "claude-sonnet-engineer",
          name: "Claude Sonnet Engineer",
          status: "active",
          chat: { status: "ready", runner: "anthropic", detail: "ready" },
          dispatch: { status: "ready", adapter: "hive-poll", detail: "queued" },
          voice: { status: "warning", detail: "missing key" },
        }],
      }),
    } as Response);

    render(<AgentEngagementConsole />);
    fireEvent.click(screen.getByRole("button", { name: /test agents/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/engagement/test", expect.objectContaining({ method: "POST" }));
      expect(screen.getByText(/chat: ready/)).toBeInTheDocument();
    });
  });

  it("queues a standup through dispatch", async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, mode: "queued" }),
    } as Response);

    render(<AgentEngagementConsole />);
    fireEvent.click(screen.getByRole("button", { name: "Standup" }));
    fireEvent.change(screen.getByPlaceholderText("What changed since the last checkpoint?"), {
      target: { value: "runtime status" },
    });
    fireEvent.click(screen.getByRole("button", { name: /start standup/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/dispatch", expect.objectContaining({ method: "POST" }));
      expect(mockRefetchDelegations).toHaveBeenCalled();
    });
  });

  it("shows an obvious standup start action above the form", () => {
    render(<AgentEngagementConsole />);

    fireEvent.click(screen.getByRole("button", { name: "Standup" }));

    expect(screen.getByRole("button", { name: /start standup with 1 agent/i })).toBeInTheDocument();
    expect(screen.getByText(/Live standup room/i)).toBeInTheDocument();
  });
});
