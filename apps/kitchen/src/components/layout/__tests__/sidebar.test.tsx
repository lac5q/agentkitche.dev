import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Sidebar } from "../sidebar";

let mockPathname = "/agents";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
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
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("MemroOS landing")).toBeTruthy();
    expect(screen.getByText("Memory")).toBeTruthy();
    expect(screen.getByText("Retained context")).toBeTruthy();
    expect(screen.getByText("Knowledge")).toBeTruthy();
    expect(screen.getByText("Source corpus")).toBeTruthy();
    expect(screen.getByText("Skills")).toBeTruthy();
    expect(screen.getByText("Procedural playbooks")).toBeTruthy();
  });

  it("scrolls to governance when the hash link is clicked from the library page", () => {
    mockPathname = "/library";
    window.history.pushState(null, "", "/library#governance");

    const target = document.createElement("section");
    target.id = "governance";
    target.scrollIntoView = vi.fn();
    document.body.appendChild(target);

    render(<Sidebar />);
    vi.mocked(target.scrollIntoView).mockClear();

    fireEvent.click(screen.getByRole("link", { name: /Governance/ }));

    expect(target.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });
});
