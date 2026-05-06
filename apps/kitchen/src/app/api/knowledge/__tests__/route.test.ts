import { mkdtempSync, mkdirSync, symlinkSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let root: string;
let configPath: string;

async function loadRoute() {
  vi.resetModules();
  vi.stubEnv("KNOWLEDGE_BASE_PATH", root);
  vi.stubEnv("COLLECTIONS_CONFIG_PATH", configPath);
  return import("../route");
}

describe("GET /api/knowledge", () => {
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "knowledge-route-"));
    configPath = path.join(root, "collections.config.json");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("counts configured real collections recursively with supported text extensions", async () => {
    mkdirSync(path.join(root, "skills", "nested"), { recursive: true });
    writeFileSync(path.join(root, "skills", "a.md"), "a");
    writeFileSync(path.join(root, "skills", "nested", "b.mdx"), "b");
    writeFileSync(path.join(root, "skills", "nested", "c.txt"), "c");
    writeFileSync(path.join(root, "skills", "nested", "ignore.json"), "{}");

    mkdirSync(path.join(root, "gdrive", "meet-recordings"), { recursive: true });
    writeFileSync(path.join(root, "gdrive", "meet-recordings", "call.md"), "call");

    mkdirSync(path.join(root, "external", "memory"), { recursive: true });
    writeFileSync(path.join(root, "external", "memory", "should-not-count.md"), "external");
    symlinkSync(path.join(root, "external"), path.join(root, "skills", "external-link"), "dir");

    writeFileSync(
      configPath,
      JSON.stringify({
        collections: [
          { name: "skills", category: "agents" },
          { name: "meet-recordings", category: "business", basePath: "gdrive/meet-recordings" },
          { name: "missing", category: "business" },
        ],
      })
    );

    const { GET } = await loadRoute();
    const response = await GET();
    const body = await response.json();

    expect(body.totalDocs).toBe(4);
    expect(body.totalFiles).toBe(4);
    expect(body.collections.find((collection: { name: string }) => collection.name === "skills").docCount).toBe(3);
    expect(body.collections.find((collection: { name: string }) => collection.name === "meet-recordings").docCount).toBe(1);
    expect(body.collections.find((collection: { name: string }) => collection.name === "missing").docCount).toBe(0);
  });
});
