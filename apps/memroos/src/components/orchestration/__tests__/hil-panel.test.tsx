import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mutateDecision = vi.fn();

vi.mock("@/lib/api-client", () => ({
  useOrchestrationHil: vi.fn(),
  useResolveOrchestrationHilMutation: vi.fn(() => ({ mutate: mutateDecision, isPending: false })),
}));

import { OrchestrationHilPanel } from "../orchestration-hil-panel";
import { useOrchestrationHil } from "@/lib/api-client";

const mockUseHil = vi.mocked(useOrchestrationHil);

describe("OrchestrationHilPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseHil.mockReturnValue({
      data: {
        decisions: [
          {
            id: "hil-1",
            runId: "run-1",
            taskSummary: "Deploy production change",
            selectedAgentId: "research-agent",
            correlationId: "corr-1",
            status: "pending",
            createdAt: "2026-05-05T10:00:00.000Z",
          },
        ],
      },
      isLoading: false,
    } as ReturnType<typeof useOrchestrationHil>);
  });

  it("renders pending approve/reject decisions and submits approval", () => {
    render(<OrchestrationHilPanel />);

    expect(screen.getByText("Human approvals")).toBeInTheDocument();
    expect(screen.getByText("Deploy production change")).toBeInTheDocument();
    expect(screen.getByText("corr-1")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Approve"));

    expect(mutateDecision).toHaveBeenCalledWith({ id: "hil-1", decision: "approve" });
  });
});
