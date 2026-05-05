import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const CANVAS_SRC = readFileSync(join(__dirname, "../react-flow-canvas.tsx"), "utf-8");
const FLOW_PAGE_SRC = readFileSync(join(__dirname, "../../../app/flow/page.tsx"), "utf-8");
const KITCHEN_PAGE_SRC = readFileSync(join(__dirname, "../../../app/page.tsx"), "utf-8");

describe("registry-backed flow roster", () => {
  it("uses registered agents instead of remote-agent-only data", () => {
    expect(FLOW_PAGE_SRC).toContain("registeredAgents");
    expect(FLOW_PAGE_SRC).not.toContain("useRemoteAgents");
    expect(CANVAS_SRC).toContain("visibleAgents");
  });

  it("does not contain hardcoded named roster constants", () => {
    const combined = `${CANVAS_SRC}\n${FLOW_PAGE_SRC}\n${KITCHEN_PAGE_SRC}`;
    expect(combined).not.toMatch(new RegExp(["KEY", "AGENT", "IDS"].join("_") + "|" + ["AGENT", "ICONS"].join("_")));
    expect(combined).not.toMatch(new RegExp(["al", "ba"].join("") + "|g" + "wen|soph" + "ia|mar" + "ia|lu" + "cia"));
  });
});
