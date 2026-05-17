import { NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { execFile, spawn } from "child_process";
import Anthropic from "@anthropic-ai/sdk";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const client = new Anthropic();

const AGENT_CONFIGS_PATH =
  process.env.AGENT_CONFIGS_PATH ||
  `${process.env.HOME}/github/knowledge/agent-configs`;
const PMO_AGENT_CONFIGS_PATH =
  process.env.PMO_AGENT_CONFIGS_PATH ||
  `${process.env.HOME}/github/PMO/agents`;
const PMO_MODEL_ROUTING_PATH =
  process.env.PMO_MODEL_ROUTING_PATH ||
  `${process.env.HOME}/github/PMO/config/model-routing.yaml`;
const OPENCODE_BIN = process.env.OPENCODE_BIN || "opencode";
const OPENCODE_CHAT_ENABLED = process.env.MEMROOS_ENABLE_OPENCODE === "true";
const OPENCODE_MAX_CONCURRENT = parsePositiveInteger(
  process.env.MEMROOS_OPENCODE_MAX_CONCURRENT,
  1
);
const OPENCODE_MAX_RSS_BYTES =
  parsePositiveInteger(process.env.MEMROOS_OPENCODE_MAX_RSS_MB, 768) * 1024 * 1024;
const OPENCODE_RSS_POLL_MS = parsePositiveInteger(
  process.env.MEMROOS_OPENCODE_RSS_POLL_MS,
  2_000
);
const OPENCODE_KILL_GRACE_MS = parsePositiveInteger(
  process.env.MEMROOS_OPENCODE_KILL_GRACE_MS,
  3_000
);
const DEFAULT_ANTHROPIC_CHAT_MODEL =
  process.env.MEMROOS_ANTHROPIC_CHAT_MODEL ||
  process.env.CHAT_MODEL ||
  "claude-haiku-4-5-20251001";
const DEFAULT_PAPERCLIP_CHAT_MODEL =
  process.env.PAPERCLIP_CHAT_MODEL || "bailian/qwen3.5-plus";

type ChatMessage = { role: "user" | "assistant"; content: string };
type AgentContext = {
  systemPrompt: string;
  source: "knowledge" | "pmo" | "fallback";
  dir: string | null;
  agentInstructions: string | null;
};
type ChatRuntime =
  | { runner: "anthropic"; model: string }
  | { runner: "opencode"; model: string };
type OpenCodeReservation =
  | { ok: true; release: () => void }
  | { ok: false; error: string };

const MODEL_ALIASES: Record<string, string> = {
  "qwen3.5": "bailian/qwen3.5-plus",
  "qwen3.5-plus": "bailian/qwen3.5-plus",
  "qwen-plus-latest": "bailian/qwen3.5-plus",
  "qwen3.6": "alibaba-coding-plan/qwen3.6-plus",
  "qwen3.6-plus": "alibaba-coding-plan/qwen3.6-plus",
  "claude-sonnet": "claude-sonnet-4-6",
  "claude-opus": "claude-opus-4-6",
  "gemini-pro": "google/gemini-2.0-pro-exp",
};

let activeOpenCodeRuns = 0;

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function tryRead(filePath: string, maxLines = 150): Promise<string | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    const lines = content.split("\n");
    return lines.length > maxLines
      ? lines.slice(0, maxLines).join("\n") + "\n\n[...truncated]"
      : content;
  } catch {
    return null;
  }
}

function agentIdCandidates(agentId: string): string[] {
  return [...new Set([
    agentId,
    agentId.replaceAll("-", "_"),
    agentId.replaceAll("_", "-"),
  ])];
}

async function resolveAgentDir(agentId: string): Promise<{ dir: string; source: "knowledge" | "pmo" } | null> {
  const candidates = agentIdCandidates(agentId);
  const roots: Array<{ root: string; source: "knowledge" | "pmo" }> = [
    { root: AGENT_CONFIGS_PATH, source: "knowledge" },
    { root: PMO_AGENT_CONFIGS_PATH, source: "pmo" },
  ];

  for (const { root, source } of roots) {
    for (const id of candidates) {
      const candidate = path.join(root, id);
      if (
        (await tryRead(path.join(candidate, "SOUL.md"), 1)) ||
        (await tryRead(path.join(candidate, "AGENTS.md"), 1))
      ) {
        return { dir: candidate, source };
      }
    }
  }

  return null;
}

async function buildAgentContext(agentId: string): Promise<AgentContext> {
  const resolved = await resolveAgentDir(agentId);
  const dir = resolved?.dir;

  if (!dir) {
    return {
      systemPrompt: "You are a helpful AI assistant embedded in MemroOS. Keep responses concise.",
      source: "fallback",
      dir: null,
      agentInstructions: null,
    };
  }

  const [soul, agentInstructions, memory, lessons, heartbeatState, heartbeat] = await Promise.all([
    tryRead(path.join(dir, "SOUL.md")),
    tryRead(path.join(dir, "AGENTS.md")),
    tryRead(path.join(dir, "MEMORY.md"), 80),
    tryRead(path.join(dir, "LESSONS.md"), 80),
    tryRead(path.join(dir, "HEARTBEAT_STATE.md"), 50),
    tryRead(path.join(dir, "HEARTBEAT.md"), 100),
  ]);

  const sections: string[] = [];
  if (soul) {
    // Strip frontmatter from SOUL.md
    sections.push(soul.replace(/^---[\s\S]*?---\n?/, "").trim());
  }
  if (agentInstructions) {
    sections.push(`\n\n## Agent Instructions\n${agentInstructions}`);
  }

  if (heartbeatState) {
    sections.push(`\n\n## Current Status\n${heartbeatState}`);
  }

  if (heartbeat && !heartbeatState) {
    sections.push(`\n\n## Recent Activity\n${heartbeat}`);
  }

  if (memory) {
    sections.push(`\n\n## Memory\n${memory}`);
  }

  if (lessons) {
    sections.push(`\n\n## Lessons Learned\n${lessons}`);
  }

  sections.push(
    `\n\n## Instructions\nYou are being spoken to directly by Luis Calderon, who built and runs you. ` +
    `Answer as yourself — your actual role, your current work, your real situation. ` +
    `Be direct and honest. Keep responses concise.`
  );

  return {
    systemPrompt: sections.join(""),
    source: resolved.source,
    dir,
    agentInstructions,
  };
}

function normalizeModel(model: string): string {
  const trimmed = model.trim().replace(/^["'`]|["'`]$/g, "");
  return MODEL_ALIASES[trimmed] ?? trimmed;
}

function isOpenCodeModel(model: string): boolean {
  return (
    model.includes("/") ||
    model.startsWith("qwen") ||
    model.startsWith("kimi") ||
    model.startsWith("gemini")
  );
}

function modelToRuntime(model: string): ChatRuntime {
  const normalized = normalizeModel(model);
  if (isOpenCodeModel(normalized)) {
    return { runner: "opencode", model: normalized };
  }
  return { runner: "anthropic", model: normalized };
}

async function pmoDefaultModelForAgent(agentId: string): Promise<string | null> {
  const routing = await tryRead(PMO_MODEL_ROUTING_PATH, 240);
  if (!routing) return null;

  const ids = agentIdCandidates(agentId);
  for (const id of ids) {
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const block = routing.match(new RegExp(`\\n\\s*${escaped}:\\s*\\n([\\s\\S]*?)(?=\\n\\s{2}[a-zA-Z0-9_-]+:|\\n#|$)`));
    const match = block?.[1]?.match(/default_model:\s*([^\s#]+)/);
    if (match?.[1]) return normalizeModel(match[1]);
  }

  const defaultRule = routing.match(/-\s+name:\s+default[\s\S]*?preferred_model:\s*([^\s#]+)/);
  return defaultRule?.[1] ? normalizeModel(defaultRule[1]) : null;
}

async function resolveChatRuntime(agentId: string, context: AgentContext): Promise<ChatRuntime> {
  const operatorOverride = process.env.MEMROOS_CHAT_MODEL;
  if (operatorOverride) return modelToRuntime(operatorOverride);

  const instructions = context.agentInstructions ?? "";
  const explicitModel = instructions.match(/(?:default_model|default model|model)\s*[:=]\s*`?([a-zA-Z0-9_.:/+-]+)/i)?.[1];
  if (explicitModel) return modelToRuntime(explicitModel);

  if (/qwen|bailian/i.test(instructions)) {
    return modelToRuntime(DEFAULT_PAPERCLIP_CHAT_MODEL);
  }

  if (context.source === "pmo") {
    return modelToRuntime((await pmoDefaultModelForAgent(agentId)) ?? DEFAULT_PAPERCLIP_CHAT_MODEL);
  }

  return modelToRuntime(DEFAULT_ANTHROPIC_CHAT_MODEL);
}

function buildOpenCodePrompt(systemPrompt: string, messages: ChatMessage[]): string {
  const transcript = messages
    .map((message) => `${message.role === "user" ? "Luis" : "Assistant"}: ${message.content}`)
    .join("\n\n");

  return [
    systemPrompt,
    "\n\n## Conversation",
    transcript,
    "\n\nReply directly to Luis as the selected agent. Keep the answer concise.",
  ].join("");
}

function stripAnsi(text: string): string {
  return text.replace(/\x1B\[[0-?]*[ -/]*[@-~]/g, "");
}

function reserveOpenCodeSlot(): OpenCodeReservation {
  if (activeOpenCodeRuns >= OPENCODE_MAX_CONCURRENT) {
    return {
      ok: false,
      error: `OpenCode chat runner is busy (${activeOpenCodeRuns}/${OPENCODE_MAX_CONCURRENT}). Try again after the active run finishes.`,
    };
  }

  activeOpenCodeRuns += 1;
  let released = false;
  return {
    ok: true,
    release: () => {
      if (released) return;
      released = true;
      activeOpenCodeRuns = Math.max(0, activeOpenCodeRuns - 1);
    },
  };
}

function processTreeRssBytes(rootPid: number): Promise<number> {
  return new Promise((resolve) => {
    execFile("/bin/ps", ["-axo", "pid=,ppid=,rss="], { timeout: 2_000 }, (error, stdout) => {
      if (error) {
        resolve(0);
        return;
      }

      const childrenByParent = new Map<number, number[]>();
      const rssByPid = new Map<number, number>();
      for (const line of stdout.split("\n")) {
        const [pidRaw, ppidRaw, rssRaw] = line.trim().split(/\s+/);
        const pid = Number.parseInt(pidRaw, 10);
        const ppid = Number.parseInt(ppidRaw, 10);
        const rssKb = Number.parseInt(rssRaw, 10);
        if (!Number.isFinite(pid) || !Number.isFinite(ppid) || !Number.isFinite(rssKb)) continue;

        rssByPid.set(pid, rssKb * 1024);
        const siblings = childrenByParent.get(ppid) ?? [];
        siblings.push(pid);
        childrenByParent.set(ppid, siblings);
      }

      let total = 0;
      const seen = new Set<number>();
      const stack = [rootPid];
      while (stack.length > 0) {
        const pid = stack.pop();
        if (!pid || seen.has(pid)) continue;

        seen.add(pid);
        total += rssByPid.get(pid) ?? 0;
        stack.push(...(childrenByParent.get(pid) ?? []));
      }

      resolve(total);
    });
  });
}

function stopProcessGroup(pid: number, signal: NodeJS.Signals) {
  try {
    process.kill(-pid, signal);
  } catch {
    try {
      process.kill(pid, signal);
    } catch {
      // Process may have already exited.
    }
  }
}

function streamOpenCodeResponse(params: {
  controller: ReadableStreamDefaultController<Uint8Array>;
  encoder: TextEncoder;
  runtime: Extract<ChatRuntime, { runner: "opencode" }>;
  systemPrompt: string;
  messages: ChatMessage[];
}) {
  const { controller, encoder, runtime, systemPrompt, messages } = params;
  const reservation = reserveOpenCodeSlot();
  if (!reservation.ok) {
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: reservation.error })}\n\n`));
    controller.close();
    return;
  }

  const prompt = buildOpenCodePrompt(systemPrompt, messages);
  const child = spawn(OPENCODE_BIN, ["run", "--model", runtime.model, "--dir", process.cwd(), prompt], {
    detached: true,
    env: { ...process.env, NO_COLOR: "1", OPENCODE_DISABLE_TUI: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  let stoppedForMemory = false;
  const timeout = setTimeout(() => {
    if (!child.pid) return;
    stopProcessGroup(child.pid, "SIGTERM");
    setTimeout(() => {
      if (child.exitCode === null && child.pid) stopProcessGroup(child.pid, "SIGKILL");
    }, OPENCODE_KILL_GRACE_MS);
  }, Number(process.env.MEMROOS_CHAT_TIMEOUT_MS ?? 90_000));
  const rssMonitor = setInterval(async () => {
    if (!child.pid || child.exitCode !== null || stoppedForMemory) return;
    const rssBytes = await processTreeRssBytes(child.pid);
    if (rssBytes <= OPENCODE_MAX_RSS_BYTES) return;

    stoppedForMemory = true;
    stopProcessGroup(child.pid, "SIGTERM");
    setTimeout(() => {
      if (child.exitCode === null && child.pid) stopProcessGroup(child.pid, "SIGKILL");
    }, OPENCODE_KILL_GRACE_MS);
  }, OPENCODE_RSS_POLL_MS);

  child.stdout.on("data", (chunk: Buffer) => {
    const text = stripAnsi(chunk.toString("utf-8"));
    if (text) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
    }
  });

  child.stderr.on("data", (chunk: Buffer) => {
    stderr += chunk.toString("utf-8");
    if (stderr.length > 2000) stderr = stderr.slice(-2000);
  });

  child.on("error", (err) => {
    clearTimeout(timeout);
    clearInterval(rssMonitor);
    reservation.release();
    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
    controller.close();
  });

  child.on("close", (code, signal) => {
    clearTimeout(timeout);
    clearInterval(rssMonitor);
    reservation.release();
    if (stoppedForMemory) {
      const rssMb = Math.round(OPENCODE_MAX_RSS_BYTES / 1024 / 1024);
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `OpenCode chat runner exceeded ${rssMb}MB RSS and was stopped.` })}\n\n`));
    } else if (code === 0) {
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
    } else {
      const detail = signal ? `chat runner stopped (${signal})` : `chat runner exited with code ${code}`;
      const cleanStderr = stripAnsi(stderr).trim();
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: cleanStderr || detail })}\n\n`));
    }
    controller.close();
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    message: string;
    agentId?: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  };

  const { message, agentId = "ceo", history = [] } = body;

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: "message required" }), { status: 400 });
  }

  const messages: ChatMessage[] = [
    ...history.slice(-10),
    { role: "user", content: message },
  ];

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const context = await buildAgentContext(agentId);
        const runtime = await resolveChatRuntime(agentId, context);

        if (runtime.runner === "opencode") {
          if (!OPENCODE_CHAT_ENABLED) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: "OpenCode chat runner is disabled on this machine." })}\n\n`));
            controller.close();
            return;
          }
          streamOpenCodeResponse({
            controller,
            encoder,
            runtime,
            systemPrompt: context.systemPrompt,
            messages,
          });
          return;
        }

        const response = await client.messages.stream({
          model: runtime.model,
          max_tokens: 1024,
          system: context.systemPrompt,
          messages,
        });

        for await (const chunk of response) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            const data = `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "stream error";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

export const __chatTest = {
  buildAgentContext,
  resolveChatRuntime,
  normalizeModel,
};
