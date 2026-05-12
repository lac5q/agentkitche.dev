import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "../sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/agents",
}));

describe("Sidebar", () => {
  it("renders memory-workflow navigation labels with concise descriptions", () => {
    render(<Sidebar />);

    expect(screen.getAllByText("MemroOS").length).toBeGreaterThan(0);
    expect(screen.getByText("Memory OS for agent workflows")).toBeTruthy();
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("MemroOS landing")).toBeTruthy();
    expect(screen.getByText("Memory")).toBeTruthy();
    expect(screen.getByText("Retained context")).toBeTruthy();
    expect(screen.getByText("Knowledge")).toBeTruthy();
    expect(screen.getByText("Source corpus")).toBeTruthy();
    expect(screen.getByText("Skills")).toBeTruthy();
    expect(screen.getByText("Procedural playbooks")).toBeTruthy();
  });
});
