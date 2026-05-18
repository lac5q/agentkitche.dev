import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "../sidebar";

let mockPathname = "/agents";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
}));

describe("Sidebar", () => {
  afterEach(() => {
    mockPathname = "/agents";
    window.history.pushState(null, "", "/");
  });

  it("renders memory-workflow navigation labels with concise descriptions", () => {
    render(<Sidebar />);

    expect(screen.getAllByText("MemroOS").length).toBeGreaterThan(0);
    expect(screen.getByText("Memory OS for agent workflows")).toBeTruthy();
    expect(screen.getByText("Operations")).toBeTruthy();
    expect(screen.getByText("NOC · efficiency · anomalies")).toBeTruthy();
    expect(screen.getByText("Memory")).toBeTruthy();
    expect(screen.getByText("Memory · Knowledge · Notebooks")).toBeTruthy();
    expect(screen.getByText("Skills")).toBeTruthy();
    expect(screen.getByText("Cookbooks · lifecycle")).toBeTruthy();
  });

  it("routes governance to the consolidated governance group", () => {
    mockPathname = "/library";

    render(<Sidebar />);

    expect(screen.getByRole("link", { name: /Governance/ })).toHaveAttribute("href", "/audit");
  });
});
