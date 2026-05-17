import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const CANVAS_SRC = readFileSync(join(__dirname, "../react-flow-canvas.tsx"), "utf-8");
const DETAIL_PANEL_SRC = readFileSync(join(__dirname, "../node-detail-panel.tsx"), "utf-8");
const FLOW_PAGE_SRC = readFileSync(join(__dirname, "../../../app/flow/page.tsx"), "utf-8");
const MEMROOS_PAGE_SRC = readFileSync(join(__dirname, "../../../app/page.tsx"), "utf-8");

describe("registry-backed flow roster", () => {
  it("uses registered agents instead of remote-agent-only data", () => {
    expect(FLOW_PAGE_SRC).toContain("registeredAgents");
    expect(FLOW_PAGE_SRC).not.toContain("useRemoteAgents");
    expect(CANVAS_SRC).toContain("visibleAgents");
    expect(FLOW_PAGE_SRC).toContain("metadata: a.metadata");
    expect(FLOW_PAGE_SRC).toContain("capabilities: a.capabilities");
    expect(FLOW_PAGE_SRC).toContain("currentTask: a.currentTask");
  });

  it("surfaces A2A and ADK indicators from registry metadata", () => {
    expect(CANVAS_SRC).toContain("A2A");
    expect(CANVAS_SRC).toContain("ADK");
    expect(CANVAS_SRC).toContain("protocol === \"a2a\"");
    expect(CANVAS_SRC).toContain("source === \"adk\"");
    expect(DETAIL_PANEL_SRC).toContain("A2A connection");
    expect(DETAIL_PANEL_SRC).toContain("Last validation");
  });

  it("does not render raw secret-like A2A metadata strings", () => {
    const combined = `${CANVAS_SRC}\n${DETAIL_PANEL_SRC}\n${FLOW_PAGE_SRC}`;
    expect(combined).not.toContain("ADK Check Prime Agent");
    expect(combined).not.toContain("Bearer ");
    expect(combined).not.toContain("ak_");
    expect(combined).not.toContain("Authorization");
  });

  it("does not contain hardcoded named roster constants", () => {
    const combined = `${CANVAS_SRC}\n${FLOW_PAGE_SRC}\n${MEMROOS_PAGE_SRC}`;
    expect(combined).not.toMatch(new RegExp(["KEY", "AGENT", "IDS"].join("_") + "|" + ["AGENT", "ICONS"].join("_")));
    expect(combined).not.toMatch(new RegExp(["al", "ba"].join("") + "|g" + "wen|soph" + "ia|mar" + "ia|lu" + "cia"));
  });
});
