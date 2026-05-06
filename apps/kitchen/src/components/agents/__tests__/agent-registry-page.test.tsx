import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RegisteredAgent } from "@/types";

const mutateRegister = vi.fn();
const mutateRegisterA2a = vi.fn();
const mutateDeregister = vi.fn();

vi.mock("@/lib/api-client", () => ({
  useRegisteredAgents: vi.fn(),
  useRegisterAgentMutation: vi.fn(() => ({ mutate: mutateRegister, isPending: false })),
  useRegisterA2aAgentCardMutation: vi.fn(() => ({ mutate: mutateRegisterA2a, isPending: false })),
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
  {
    id: "adk-prime",
    name: "ADK Prime Agent",
    role: "Checks prime numbers",
    platform: "gemini",
    protocol: "a2a",
    status: "active",
    lastHeartbeat: "2026-05-05T06:05:00.000Z",
    currentTask: null,
    lessonsCount: 0,
    todayMemoryCount: 0,
    location: "tailscale",
    isRemote: true,
    latencyMs: 42,
    capabilities: [{ id: "check_prime", name: "Check Prime", description: "", tags: ["adk", "a2a"] }],
    metadata: {
      a2a: {
        cardUrl: "https://user:pass@example.test/.well-known/agent-card.json",
        endpointUrl: "https://user:pass@example.test/a2a/check_prime_agent",
        version: "1.0",
        securitySchemes: {
          bearerAuth: { type: "http", scheme: "bearer" },
          apiKeyAuth: { type: "apiKey", in: "header", name: "Authorization" },
        },
        inputModes: ["text"],
        outputModes: ["text"],
        validationStatus: "validated",
        lastFetchedAt: "2026-05-05T06:04:00.000Z",
        source: "adk",
        outboundAuth: { envKey: "REMOTE_A2A_TOKEN", token: "Bearer leaked", apiKey: "ak_leaked" },
      },
    },
    host: "100.64.0.9",
    port: 8001,
    healthEndpoint: "/.well-known/agent-card.json",
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

    expect(screen.getByText("Hire Crew")).toBeInTheDocument();
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

    fireEvent.click(screen.getAllByText("Deregister")[0]);
    expect(mutateDeregister).toHaveBeenCalledWith("rest-agent");
  });

  it("supports A2A card registration mode", () => {
    render(<AgentRegistryPage />);

    fireEvent.click(screen.getByText("A2A card URL"));
    expect(screen.getByText("Register A2A Agent")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("A2A agent-card URL"), {
      target: { value: "http://localhost:8001/a2a/check_prime_agent/.well-known/agent-card.json" },
    });
    fireEvent.click(screen.getByText("Register A2A Agent"));

    expect(mutateRegisterA2a).toHaveBeenCalledWith(
      expect.objectContaining({
        cardUrl: "http://localhost:8001/a2a/check_prime_agent/.well-known/agent-card.json",
        source: "adk",
      }),
      expect.any(Object)
    );
  });

  it("renders A2A/ADK metadata without credential-bearing strings", () => {
    render(<AgentRegistryPage />);

    expect(screen.getAllByText("ADK").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText("ADK Prime Agent"));

    expect(screen.getByText("Last validation")).toBeInTheDocument();
    expect(screen.getAllByText("example.test").length).toBeGreaterThan(0);
    expect(screen.queryByText(/user:pass@/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Authorization/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Bearer /)).not.toBeInTheDocument();
    expect(screen.queryByText(/ak_/)).not.toBeInTheDocument();
  });
});
