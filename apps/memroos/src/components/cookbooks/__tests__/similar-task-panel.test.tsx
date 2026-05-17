import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api-client", () => ({
  useSimilarTaskRecommendations: vi.fn(() => ({
    data: {
      recommendations: [
        {
          capabilityId: "skill:foo",
          name: "foo",
          description: "d",
          type: "skill",
          contextScore: 3,
          overallScore: 9,
          reason: "Context: code-review in myrepo",
        },
      ],
      context: { task_type: "code-review" },
      timestamp: "2026-05-04T00:00:00.000Z",
    },
    isLoading: false,
  })),
}));

import { SimilarTaskPanel } from "@/components/cookbooks/similar-task-panel";
import { useSimilarTaskRecommendations } from "@/lib/api-client";

describe("SimilarTaskPanel", () => {
  it("renders recommendation list when data available", () => {
    render(<SimilarTaskPanel context={{ task_type: "code-review" }} />);
    expect(screen.getByText("foo")).toBeInTheDocument();
  });

  it("shows empty state when no recommendations", () => {
    vi.mocked(useSimilarTaskRecommendations).mockReturnValueOnce({
      data: { recommendations: [], context: {}, timestamp: "" },
      isLoading: false,
    } as ReturnType<typeof useSimilarTaskRecommendations>);
    render(<SimilarTaskPanel />);
    expect(screen.getByText(/no similar-task recommendations/i)).toBeInTheDocument();
  });

  it("displays context match score badge on each item", () => {
    render(<SimilarTaskPanel context={{ task_type: "code-review" }} />);
    expect(screen.getByText("+3")).toBeInTheDocument();
  });
});
