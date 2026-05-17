// @vitest-environment node
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getToolAttention, getSimilarTaskRecommendations } from "@/lib/tool-attention";

let tempRoot: string | undefined;

afterEach(() => {
  vi.unstubAllEnvs();
  if (tempRoot) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    tempRoot = undefined;
  }
});

describe("contextMatchSignal", () => {
  function makeOutcomeFile(root: string, records: object[]): string {
    const p = path.join(root, "outcomes.jsonl");
    fs.writeFileSync(p, records.map((r) => JSON.stringify(r)).join("\n") + "\n");
    return p;
  }

  function makeCatalogFile(root: string, toolId: string): string {
    const p = path.join(root, "catalog.json");
    fs.writeFileSync(
      p,
      JSON.stringify({
        capabilities: [
          { id: toolId, name: toolId, type: "mcp-tool", source: "test", description: "d",
            status: "available", tags: [], useWhen: [], topLevel: false, loadCommand: null },
        ],
        sources: [],
      })
    );
    return p;
  }

  it("scores task_type match * 2", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ctx-"));
    const outcomesPath = makeOutcomeFile(root, [
      { timestamp: "t", toolId: "skill:foo", outcome: "helped", metadata: { task_type: "code-review" } },
    ]);
    const catalogPath = makeCatalogFile(root, "skill:foo");
    vi.stubEnv("MEMROOS_ROOT", root);
    vi.stubEnv("TOOL_ATTENTION_CATALOG", catalogPath);
    vi.stubEnv("TOOL_ATTENTION_OUTCOMES", outcomesPath);
    vi.stubEnv("SKILLS_PATH", path.join(root, "no-skills"));

    const result = getSimilarTaskRecommendations({ task_type: "code-review" });
    const rec = result.recommendations.find((r) => r.capabilityId === "skill:foo");
    expect(rec).toBeDefined();
    expect(rec!.contextScore).toBeGreaterThanOrEqual(2);

    fs.rmSync(root, { recursive: true, force: true });
  });

  it("scores repo match * 2", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ctx-"));
    const outcomesPath = makeOutcomeFile(root, [
      { timestamp: "t", toolId: "skill:bar", outcome: "helped", metadata: { repo: "my-repo" } },
    ]);
    const catalogPath = makeCatalogFile(root, "skill:bar");
    vi.stubEnv("MEMROOS_ROOT", root);
    vi.stubEnv("TOOL_ATTENTION_CATALOG", catalogPath);
    vi.stubEnv("TOOL_ATTENTION_OUTCOMES", outcomesPath);
    vi.stubEnv("SKILLS_PATH", path.join(root, "no-skills"));

    const result = getSimilarTaskRecommendations({ repo: "my-repo" });
    const rec = result.recommendations.find((r) => r.capabilityId === "skill:bar");
    expect(rec).toBeDefined();
    expect(rec!.contextScore).toBeGreaterThanOrEqual(2);

    fs.rmSync(root, { recursive: true, force: true });
  });

  it("scores agent_id match * 1", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ctx-"));
    const outcomesPath = makeOutcomeFile(root, [
      { timestamp: "t", toolId: "skill:baz", outcome: "helped", metadata: { agent_id: "claude-1" } },
    ]);
    const catalogPath = makeCatalogFile(root, "skill:baz");
    vi.stubEnv("MEMROOS_ROOT", root);
    vi.stubEnv("TOOL_ATTENTION_CATALOG", catalogPath);
    vi.stubEnv("TOOL_ATTENTION_OUTCOMES", outcomesPath);
    vi.stubEnv("SKILLS_PATH", path.join(root, "no-skills"));

    const result = getSimilarTaskRecommendations({ agent_id: "claude-1" });
    const rec = result.recommendations.find((r) => r.capabilityId === "skill:baz");
    expect(rec).toBeDefined();
    expect(rec!.contextScore).toBeGreaterThanOrEqual(1);

    fs.rmSync(root, { recursive: true, force: true });
  });

  it("never reads task field", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "ctx-"));
    const toolId = "skill:secret-test";
    const catalog = makeCatalogFile(root, toolId);

    const outcomesWithTask = makeOutcomeFile(root, [
      { timestamp: "t", toolId, task: "top secret task text", outcome: "helped",
        metadata: { task_type: "analysis" } },
    ]);
    vi.stubEnv("MEMROOS_ROOT", root);
    vi.stubEnv("TOOL_ATTENTION_CATALOG", catalog);
    vi.stubEnv("TOOL_ATTENTION_OUTCOMES", outcomesWithTask);
    vi.stubEnv("SKILLS_PATH", path.join(root, "no-skills"));
    const resultWithTask = getSimilarTaskRecommendations({ task_type: "analysis" });

    const outcomesWithoutTask = makeOutcomeFile(root, [
      { timestamp: "t", toolId, outcome: "helped", metadata: { task_type: "analysis" } },
    ]);
    vi.stubEnv("TOOL_ATTENTION_OUTCOMES", outcomesWithoutTask);
    const resultWithoutTask = getSimilarTaskRecommendations({ task_type: "analysis" });

    const recWith = resultWithTask.recommendations.find((r) => r.capabilityId === toolId);
    const recWithout = resultWithoutTask.recommendations.find((r) => r.capabilityId === toolId);
    expect(recWith).toBeDefined();
    expect(recWithout).toBeDefined();
    expect(recWith!.contextScore).toEqual(recWithout!.contextScore);
    expect(recWith!.overallScore).toEqual(recWithout!.overallScore);

    fs.rmSync(root, { recursive: true, force: true });
  });
});

describe("getToolAttention", () => {
  it("redacts absolute local paths from the UI response", () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tool-attention-"));
    const catalogPath = path.join(tempRoot, "services", "knowledge-mcp", "tool-catalog.json");
    const outcomesPath = path.join(tempRoot, "logs", "tool-attention-outcomes.jsonl");
    const skillsPath = path.join(tempRoot, "skills");

    fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
    fs.mkdirSync(path.dirname(outcomesPath), { recursive: true });
    fs.mkdirSync(path.join(skillsPath, "sample-skill"), { recursive: true });
    fs.writeFileSync(path.join(tempRoot, ".mcp.json"), JSON.stringify({ mcpServers: { gitnexus: {} } }));
    fs.writeFileSync(
      catalogPath,
      JSON.stringify({
        sources: [
          {
            id: "external-source",
            label: "External Source",
            type: "external",
            path: path.join(tempRoot, "private", "catalog.json"),
            status: "available",
          },
        ],
        capabilities: [
          {
            id: "external:router",
            name: "router",
            type: "reference",
            source: "external-source",
            description: "Routes tool choices",
            status: "candidate",
            tags: ["router"],
            useWhen: ["Need routing"],
            topLevel: false,
            loadCommand: `Read ${path.join(tempRoot, "private", "router.md")}`,
          },
        ],
      })
    );
    fs.writeFileSync(
      outcomesPath,
      JSON.stringify({ timestamp: "2026-04-30T00:00:00Z", toolId: "external:router", task: "x", outcome: "helped" })
    );

    vi.stubEnv("MEMROOS_ROOT", tempRoot);
    vi.stubEnv("TOOL_ATTENTION_CATALOG", catalogPath);
    vi.stubEnv("TOOL_ATTENTION_OUTCOMES", outcomesPath);
    vi.stubEnv("SKILLS_PATH", skillsPath);

    const data = getToolAttention("", 100);
    const payload = JSON.stringify(data);

    expect(payload).not.toContain(tempRoot);
    expect(data.health).toEqual({
      status: "ok",
      catalog: "available",
      outcomes: "available",
      messages: [],
    });
    expect(data.sources.find((source) => source.id === "root-mcp-json")?.path).toBe(".mcp.json");
    expect(data.sources.find((source) => source.id === "external-source")?.path).toBe("private/catalog.json");
  });

  it("surfaces optional Agent Lightning capability and GitNexus status", () => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "tool-attention-"));
    const catalogPath = path.join(tempRoot, "services", "knowledge-mcp", "tool-catalog.json");
    const outcomesPath = path.join(tempRoot, "logs", "tool-attention-outcomes.jsonl");
    const home = path.join(tempRoot, "home");

    fs.mkdirSync(path.dirname(catalogPath), { recursive: true });
    fs.mkdirSync(path.dirname(outcomesPath), { recursive: true });
    fs.mkdirSync(path.join(tempRoot, "apps", "memroos"), { recursive: true });
    fs.mkdirSync(path.join(home, ".gitnexus"), { recursive: true });
    fs.writeFileSync(path.join(tempRoot, ".mcp.json"), JSON.stringify({ mcpServers: { gitnexus: {} } }));
    fs.writeFileSync(path.join(tempRoot, "apps", "memroos", "package.json"), JSON.stringify({ scripts: { "apo:worker": "node worker.js" } }));
    fs.writeFileSync(path.join(home, ".gitnexus", "registry.json"), "{}");
    fs.writeFileSync(catalogPath, JSON.stringify({ capabilities: [], sources: [] }));
    fs.writeFileSync(outcomesPath, "");

    vi.stubEnv("MEMROOS_ROOT", tempRoot);
    vi.stubEnv("HOME", home);
    vi.stubEnv("TOOL_ATTENTION_CATALOG", catalogPath);
    vi.stubEnv("TOOL_ATTENTION_OUTCOMES", outcomesPath);
    vi.stubEnv("SKILLS_PATH", path.join(tempRoot, "no-skills"));
    vi.stubEnv("MEMROOS_OPTIONAL_CAPABILITIES", "gitnexus,agent-lightning");

    const data = getToolAttention("agent lightning APO skill proposals", 10);
    const agentLightning = data.capabilities.find((item) => item.id === "capability:agent-lightning");
    expect(agentLightning).toBeDefined();
    expect(agentLightning?.status).toBe("degraded");

    const gitnexus = getToolAttention("gitnexus", 10).capabilities.find((item) => item.id === "mcp-server:gitnexus");
    expect(gitnexus?.status).toBe("available");
  });
});
