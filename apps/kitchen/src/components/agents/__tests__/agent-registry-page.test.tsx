import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RegisteredAgent } from "@/types";

const mutateRegister = vi.fn();
const mutateDeregister = vi.fn();

vi.mock("@/lib/api-client", () => ({
  useRegisteredAgents: vi.fn(),
  useRegisterAgentMutation: vi.fn(() => ({ mutate: mutateRegister, isPending: false })),
  useDeregisterAgentMutation: vi.fn(() => ({ mutate: mutateDeregister, isPending: false })),
}));

import AgentRegistryPage from "@/app/agents/page";
import { useRegisteredAgents } from "@/lib/api-client";

const mockUseRegisteredAgents = vi.mocked(useRegisteredAgents);

const agents: RegisteredAgent[] = [
  {
    id: "rest-agent",
    name: "REST Agent",
    role: "Reports liveness",
    platform: "codex",
    protocol: "rest",
    status: "active",
    lastHeartbeat: "2026-05-05T06:00:00.000Z",
    currentTask: "checking in",
    lessonsCount: 0,
    todayMemoryCount: 0,
    location: "local",
    isRemote: false,
    latencyMs: null,
    capabilities: [{ id: "heartbeat", name: "Heartbeat", description: "", tags: [] }],
    metadata: {},
    host: null,
    port: null,
    healthEndpoint: null,
    tunnelUrl: null,
    createdAt: "2026-05-05T06:00:00.000Z",
    updatedAt: "2026-05-05T06:00:00.000Z",
    deregisteredAt: null,
  },
];

describe("AgentRegistryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRegisteredAgents.mockReturnValue({ data: { agents, timestamp: "" }, isLoading: false } as ReturnType<typeof useRegisteredAgents>);
  });

  it("lists registered agents with capabilities, status, heartbeat, and protocol", () => {
    render(<AgentRegistryPage />);

    expect(screen.getByText("Agent Registry")).toBeInTheDocument();
    expect(screen.getByText("REST Agent")).toBeInTheDocument();
    expect(screen.getAllByText("rest").length).toBeGreaterThan(0);
    expect(screen.getAllByText("active").length).toBeGreaterThan(0);
    expect(screen.getByText("Heartbeat")).toBeInTheDocument();
    expect(screen.getByText("Last Heartbeat")).toBeInTheDocument();
  });

  it("submits registration and can deregister an agent", () => {
    render(<AgentRegistryPage />);

    fireEvent.change(screen.getByLabelText("Agent name"), { target: { value: "New Agent" } });
    fireEvent.change(screen.getByLabelText("Agent role"), { target: { value: "Does work" } });
    fireEvent.change(screen.getByLabelText("Agent capabilities"), { target: { value: "Memory, Tools" } });
    fireEvent.click(screen.getByText("Register"));

    expect(mutateRegister).toHaveBeenCalledWith(
      expect.objectContaining({ id: "new-agent", protocol: "rest" }),
      expect.any(Object)
    );

    fireEvent.click(screen.getByText("Deregister"));
    expect(mutateDeregister).toHaveBeenCalledWith("rest-agent");
  });
});
