import { execFileSync } from "child_process";
import { stat as fsStat } from "fs/promises";
import { MEM0_URL, AGENT_CONFIGS_PATH } from "@/lib/constants";
import type { HealthStatus } from "@/types";

export const dynamic = "force-dynamic";

type ServiceCheckResult = {
  status?: HealthStatus["status"];
  detail?: string;
};

async function checkService(
  name: string,
  checkFn: () => Promise<void | ServiceCheckResult>
): Promise<HealthStatus> {
  const start = Date.now();
  try {
    const result = await checkFn();
    return {
      service: name,
      status: result?.status ?? "up",
      latencyMs: Date.now() - start,
      lastCheck: new Date().toISOString(),
      detail: result?.detail,
    };
  } catch {
    return {
      service: name,
      status: "down",
      latencyMs: null,
      lastCheck: new Date().toISOString(),
    };
  }
}

async function checkMem0(): Promise<ServiceCheckResult> {
  const response = await fetch(`${MEM0_URL}/health`, { signal: AbortSignal.timeout(2000) });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const body = await response.json().catch(() => ({}));
  const details: string[] = [];
  const queue = body.queue as { queued?: number | null } | undefined;
  const queued = typeof queue?.queued === "number" ? queue.queued : 0;
  const vectorStore = typeof body.vector_store === "string" ? body.vector_store : "unknown";

  if (body.status === "degraded") {
    details.push("mem0 reports degraded");
  }
  if (queued > 0) {
    details.push(`${queued} queued memory saves`);
  }
  if (vectorStore !== "connected" && vectorStore !== "unknown") {
    details.push(`vector store ${vectorStore}`);
  }

  return details.length > 0
    ? { status: "degraded", detail: details.join("; ") }
    : { status: "up" };
}

export async function GET() {
  const services = await Promise.all([
    checkService("RTK", async () => {
      execFileSync("rtk", ["--version"], { timeout: 2000 });
    }),
    checkService("mem0", async () => {
      return checkMem0();
    }),
    checkService("QMD", async () => {
      execFileSync("which", ["qmd"], { timeout: 2000 });
    }),
    checkService("Agents", async () => {
      await fsStat(AGENT_CONFIGS_PATH);
    }),
    checkService("APO", async () => {
      const { stat } = await import("fs/promises");
      await stat(`${process.env.HOME}/.openclaw/skills/proposals`);
    }),
  ]);

  return Response.json({ services, timestamp: new Date().toISOString() });
}
