import type React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const mutate = vi.fn();

vi.mock("@/components/ui/card", () => ({
  Card: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => (
    <div className={className} onClick={onClick}>{children}</div>
  ),
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/lib/api-client", () => ({
  useApproveApoProposalMutation: () => ({ mutate, isPending: false, isError: false, error: null }),
}));

import { ProposalCard } from "../proposal-card";

const pendingProposal = {
  id: "APO_PROPOSAL_ceo_ceo_20260505_120000.md",
  filename: "APO_PROPOSAL_ceo_ceo_20260505_120000.md",
  skill: "ceo",
  subsystem: "ceo",
  timestamp: "2026-05-05T12:00:00Z",
  content: "# Agent-Lightning APO Proposal\n\nProposal body",
  status: "pending" as const,
};

describe("ProposalCard", () => {
  beforeEach(() => {
    mutate.mockClear();
  });

  it("approves a pending proposal without opening the detail drawer", () => {
    const onClick = vi.fn();
    render(<ProposalCard proposal={pendingProposal} onClick={onClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    expect(mutate).toHaveBeenCalledWith(pendingProposal.id);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("does not show approve for archived proposals", () => {
    render(<ProposalCard proposal={{ ...pendingProposal, status: "archived" }} onClick={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Approve" })).not.toBeInTheDocument();
  });
});
