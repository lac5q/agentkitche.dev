// @vitest-environment node
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let root: string;
let agentConfigsPath: string;
let pmoAgentsPath: string;
let pmoModelRoutingPath: string;

async function loadRoute() {
  vi.resetModules();
  vi.stubEnv("AGENT_CONFIGS_PATH", agentConfigsPath);
  vi.stubEnv("PMO_AGENT_CONFIGS_PATH", pmoAgentsPath);
  vi.stubEnv("PMO_MODEL_ROUTING_PATH", pmoModelRoutingPath);
  vi.stubEnv("CONSOLIDATION_MODEL", "MiniMax-M2.7");
  return import("../route");
}

describe("chat route model resolution", () => {
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "chat-route-"));
    agentConfigsPath = path.join(root, "knowledge-agents");
    pmoAgentsPath = path.join(root, "pmo-agents");
    pmoModelRoutingPath = path.join(root, "model-routing.yaml");
    mkdirSync(path.join(pmoAgentsPath, "ceo"), { recursive: true });
    mkdirSync(agentConfigsPath, { recursive: true });
    writeFileSync(
      path.join(pmoAgentsPath, "ceo", "AGENTS.md"),
      "# CEO\n\nYou run on Qwen/Bailian. You do NOT have MCP tool access.\n"
    );
    writeFileSync(
      pmoModelRoutingPath,
      [
        "rules:",
        "  - name: default",
        "    match: {}",
        "    tier: standard",
        "    preferred_model: qwen3.5",
        "",
      ].join("\n")
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(root, { recursive: true, force: true });
  });

  it("uses Paperclip/PMO agent instructions instead of the consolidation model", async () => {
    const { __chatTest } = await loadRoute();

    const context = await __chatTest.buildAgentContext("ceo");
    const runtime = await __chatTest.resolveChatRuntime("ceo", context);

    expect(context.source).toBe("pmo");
    expect(context.agentInstructions).toContain("Qwen/Bailian");
    expect(runtime).toEqual({ runner: "opencode", model: "bailian/qwen3.5-plus" });
  });

  it("falls back to the PMO default routing model for PMO agents", async () => {
    mkdirSync(path.join(pmoAgentsPath, "marketing_qa"), { recursive: true });
    writeFileSync(path.join(pmoAgentsPath, "marketing_qa", "AGENTS.md"), "# Marketing QA\n");
    const { __chatTest } = await loadRoute();

    const context = await __chatTest.buildAgentContext("marketing-qa");
    const runtime = await __chatTest.resolveChatRuntime("marketing-qa", context);

    expect(context.source).toBe("pmo");
    expect(runtime).toEqual({ runner: "opencode", model: "bailian/qwen3.5-plus" });
  });

  it("keeps memory consolidation model out of chat model selection", () => {
    const source = readFileSync(path.join(process.cwd(), "src/app/api/chat/route.ts"), "utf-8");

    expect(source).not.toContain("process.env.CONSOLIDATION_MODEL");
  });

  it("gates OpenCode execution behind an explicit operator flag", () => {
    const source = readFileSync(path.join(process.cwd(), "src/app/api/chat/route.ts"), "utf-8");

    expect(source).toContain('process.env.KITCHEN_ENABLE_OPENCODE === "true"');
    expect(source).toContain("OpenCode chat runner is disabled on this machine.");
  });

  it("keeps enabled OpenCode runs bounded by concurrency and RSS limits", () => {
    const source = readFileSync(path.join(process.cwd(), "src/app/api/chat/route.ts"), "utf-8");

    expect(source).toContain("KITCHEN_OPENCODE_MAX_CONCURRENT");
    expect(source).toContain("activeOpenCodeRuns");
    expect(source).toContain("KITCHEN_OPENCODE_MAX_RSS_MB");
    expect(source).toContain("OpenCode chat runner exceeded");
    expect(source).toContain("stopProcessGroup");
  });

  it("allows an explicit operator chat model override", async () => {
    vi.stubEnv("KITCHEN_CHAT_MODEL", "alibaba-coding-plan/qwen3.6-plus");
    const { __chatTest } = await loadRoute();

    const context = await __chatTest.buildAgentContext("ceo");
    const runtime = await __chatTest.resolveChatRuntime("ceo", context);

    expect(runtime).toEqual({ runner: "opencode", model: "alibaba-coding-plan/qwen3.6-plus" });
  });
});
