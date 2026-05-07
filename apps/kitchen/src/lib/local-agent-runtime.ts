import { execFileSync } from "child_process";
import type { AgentPlatform } from "@/types";

interface ProcessRow {
  pid: number;
  ppid: number;
  command: string;
}

interface AgentCliProcess extends ProcessRow {
  platform: AgentPlatform;
}

export interface LocalAgentRuntimeSummary {
  activeCliCount: number;
  byPlatform: Partial<Record<AgentPlatform, number>>;
  scannedAt: string;
}

const SHELL_WRAPPER_RE = /(?:^|\s)(?:\/bin\/(?:ba|z)?sh|bash|zsh|sh)\s+-c\s/i;
const DESKTOP_APP_RE = /\/Applications\/(?:Claude|Codex)\.app\//i;

function parsePsOutput(output: string): ProcessRow[] {
  return output
    .split("\n")
    .map((line) => line.match(/^\s*(\d+)\s+(\d+)\s+(.+?)\s*$/))
    .filter((match): match is RegExpMatchArray => Boolean(match))
    .map((match) => ({
      pid: Number(match[1]),
      ppid: Number(match[2]),
      command: match[3],
    }));
}

function isDirectCliProcess(command: string): boolean {
  return !SHELL_WRAPPER_RE.test(command) && !DESKTOP_APP_RE.test(command);
}

function detectCliPlatform(command: string): AgentPlatform | null {
  if (!isDirectCliProcess(command)) return null;
  if (/\bhermes_cli\.main\b|(?:^|\s)(?:\S*\/)?hermes(?:\s|$)/i.test(command)) return "hermes";
  if (/(?:^|\s)(?:node\s+)?(?:\S*\/)?qwen(?:\s|$)/i.test(command)) return "qwen";
  if (/(?:^|\s)(?:\S*\/)?claude(?:\s|$)/i.test(command)) return "claude";
  if (/(?:^|\s)(?:\S*\/)?codex(?:\s|$)/i.test(command)) return "codex";
  if (/(?:^|\s)(?:node\s+)?(?:\S*\/)?gemini(?:\s|$)/i.test(command)) return "gemini";
  if (/(?:^|\s)(?:\S*\/)?(?:opencode|opencode-ai)(?:\s|$)/i.test(command)) return "opencode";
  if (/(?:^|\s)(?:\S*\/)?openclaw(?:\s|$)/i.test(command)) return "openclaw";
  return null;
}

export function summarizeAgentCliProcesses(
  psOutput: string,
  scannedAt = new Date().toISOString()
): LocalAgentRuntimeSummary {
  const candidates = parsePsOutput(psOutput).flatMap((processRow): AgentCliProcess[] => {
    const platform = detectCliPlatform(processRow.command);
    return platform ? [{ ...processRow, platform }] : [];
  });
  const candidatesByPid = new Map(candidates.map((processRow) => [processRow.pid, processRow]));
  const sessionRoots = candidates.filter((processRow) => {
    const parent = candidatesByPid.get(processRow.ppid);
    return !parent || parent.platform !== processRow.platform;
  });

  const byPlatform: Partial<Record<AgentPlatform, number>> = {};
  for (const processRow of sessionRoots) {
    byPlatform[processRow.platform] = (byPlatform[processRow.platform] ?? 0) + 1;
  }

  return {
    activeCliCount: sessionRoots.length,
    byPlatform,
    scannedAt,
  };
}

export function getLocalAgentRuntime(): LocalAgentRuntimeSummary {
  try {
    const output = execFileSync("ps", ["-axo", "pid=,ppid=,command="], {
      encoding: "utf-8",
      timeout: 2000,
    });
    return summarizeAgentCliProcesses(output);
  } catch {
    return {
      activeCliCount: 0,
      byPlatform: {},
      scannedAt: new Date().toISOString(),
    };
  }
}
