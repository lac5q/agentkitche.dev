// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HealthPanel } from "@/components/library/health-panel";
import type { KnowledgeCollection } from "@/types";

function collection(name: string, docCount: number): KnowledgeCollection {
  return {
    name,
    docCount,
    category: "business",
    lastUpdated: new Date().toISOString(),
  };
}

describe("HealthPanel", () => {
  it("aggregates Google/Apple and Spark meeting collections", () => {
    render(
      <HealthPanel
        collections={[
          collection("meet-recordings", 12),
          collection("spark-recordings", 3),
          collection("projects", 20),
        ]}
        totalFiles={35}
      />
    );

    expect(screen.getByText("Meeting + Call Recordings")).toBeTruthy();
    expect(screen.getByText("15 files indexed")).toBeTruthy();
  });

  it("shows when Spark meetings are missing from the meeting bucket", () => {
    render(
      <HealthPanel
        collections={[collection("meet-recordings", 12)]}
        totalFiles={12}
      />
    );

    expect(screen.getByText("Missing spark-recordings")).toBeTruthy();
  });
});
