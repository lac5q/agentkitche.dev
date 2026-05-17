import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  addMemory,
  buildContextInjection,
  memoryTool,
  purgeExpiredMemories,
  searchMemories,
} from "../memory-client";

let tempRoot: string | null = null;

function root() {
  tempRoot = mkdtempSync(path.join(tmpdir(), "hermes-memory-"));
  return tempRoot;
}

afterEach(() => {
  if (tempRoot) rmSync(tempRoot, { recursive: true, force: true });
  tempRoot = null;
});

describe("Hermes memory client v2", () => {
  it("returns semantic matches with no exact keyword overlap", () => {
    const hermesRoot = root();
    addMemory(hermesRoot, { content: "Use env driven provider settings for model routing.", tags: ["config"] });

    const results = searchMemories(hermesRoot, "how to configure models", { limit: 3 });

    expect(results[0].score).toBeGreaterThanOrEqual(0.5);
    expect(results[0].content).toContain("provider settings");
  });

  it("caps context injection and merges duplicate memories", () => {
    const hermesRoot = root();
    const first = addMemory(hermesRoot, { content: "A/B tests should retain experiment decisions.", tags: ["product"] });
    const merged = addMemory(hermesRoot, { content: "A/B tests should retain experiment decisions.", tags: ["product"] });

    expect(first.id).toBe(merged.id);
    expect(merged.mergeCount).toBe(2);

    for (let i = 0; i < 30; i++) {
      addMemory(hermesRoot, { content: `A/B experiment memory ${i} with useful but repeated context.` });
    }

    const injection = buildContextInjection(hermesRoot, "A/B tests", { maxChars: 1500 });
    expect(injection.text.length).toBeLessThanOrEqual(1500);
    expect(injection.memories.every((memory) => memory.score >= 0.5)).toBe(true);
  });

  it("archives expired memories and keeps backward-compatible memory tool calls", () => {
    const hermesRoot = root();
    const expired = addMemory(hermesRoot, {
      content: "temporary fact",
      ttlDays: 1,
      createdAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    });

    const compat = memoryTool(hermesRoot, {
      action: "add",
      target: "memory",
      content: "legacy compatible fact",
    });
    expect(compat.ok).toBe(true);

    const purged = purgeExpiredMemories(hermesRoot, new Date());
    expect(purged.archived).toContain(expired.id);
    expect(searchMemories(hermesRoot, "legacy compatible fact")).toHaveLength(1);
  });
});
