import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AgentGrid } from "../agent-grid";
import type { Agent } from "@/types";

vi.mock("../agent-drawer", () => ({
  AgentDrawer: () => null,
}));

function agent(overrides: Partial<Agent>): Agent {
  return {
    id: "agent",
    name: "Agent",
    role: "does work",
    platform: "codex",
    status: "active",
    lastHeartbeat: new Date().toISOString(),
    currentTask: null,
    lessonsCount: 0,
    todayMemoryCount: 0,
    ...overrides,
  };
}

describe("AgentGrid hierarchy labels", () => {
  it("shows harness and subagent relationship labels", () => {
    render(
      <AgentGrid
        agents={[
          agent({ id: "paperclip", name: "Paperclip", role: "Harness" }),
          agent({ id: "worker-1", name: "Worker 1", role: "Research", masterId: "paperclip" }),
        ]}
      />
    );

    expect(screen.getByText("Harness for")).toBeTruthy();
    expect(screen.getByText("1 subagent")).toBeTruthy();
    expect(screen.getByText("Subagent of")).toBeTruthy();
    expect(screen.getAllByText("Paperclip").length).toBeGreaterThanOrEqual(1);
  });
});
