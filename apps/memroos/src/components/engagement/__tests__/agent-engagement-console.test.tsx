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

function chatStream(text: string): Response {
  return new Response(`data: ${JSON.stringify({ text })}\n\ndata: [DONE]\n\n`, {
    status: 200,
    headers: { "Content-Type": "text/event-stream" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
});

describe("AgentEngagementConsole", () => {
  it("renders direct chat plus one unified room mode", () => {
    render(<AgentEngagementConsole />);

    expect(screen.getByText("Agent Engagement")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Direct Chat" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Group Room" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Conference" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Claude Sonnet Engineer").length).toBeGreaterThan(0);
  });

  it("keeps dormant registered agents visible when active agents exist", () => {
    render(<AgentEngagementConsole />);

    expect(screen.getAllByText("Claude Sonnet Engineer").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Codex CLI").length).toBeGreaterThan(0);
    expect(screen.getByText("1 active / 2 registered")).toBeInTheDocument();
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

  it("runs a 15-minute standup as a live room turn", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(chatStream("Runtime is healthy. No blockers."));

    render(<AgentEngagementConsole />);
    fireEvent.click(screen.getByRole("button", { name: "Group Room" }));
    fireEvent.change(screen.getByLabelText(/Standup focus/i), {
      target: { value: "Memroos dispatch reliability" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Run 15-minute standup/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/chat", expect.objectContaining({ method: "POST" }));
      const [, init] = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(String(init?.body));
      expect(body.message).toContain("15-minute standup");
      expect(body.message).toContain("Yesterday");
      expect(body.message).toContain("Today");
      expect(body.message).toContain("Memroos dispatch reliability");
      expect(screen.getByText("Runtime is healthy. No blockers.")).toBeInTheDocument();
    });
  });

  it("shows obvious room actions above the form", () => {
    render(<AgentEngagementConsole />);

    fireEvent.click(screen.getByRole("button", { name: "Group Room" }));

    expect(screen.getByRole("button", { name: /Run 15-minute standup/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Start conference round/i })).toBeInTheDocument();
    expect(screen.getByText(/Room session/i)).toBeInTheDocument();
  });
});
