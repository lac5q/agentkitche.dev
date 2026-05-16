import crypto from "crypto";
import fs from "fs";
import path from "path";

import { getRepoRoot, resolveFromRepoRoot } from "@/lib/paths";
import type { AgentEvalTrace, EvalConfig, GoldenSetExample } from "./types";

function parseJsonl(raw: string): GoldenSetExample[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as GoldenSetExample);
}

export function goldenSetPathForTrace(config: EvalConfig, trace: Pick<AgentEvalTrace, "agentId" | "role">): string {
  const agentOverride = config.agents[trace.agentId]?.eval?.goldenSet;
  if (agentOverride) return agentOverride;
  if (trace.role && config.goldenSets.perRole[trace.role]) return config.goldenSets.perRole[trace.role];
  return config.goldenSets.default;
}

function isWithinGoldenSetsDir(absolute: string): boolean {
  // Resolve to prevent ../ traversal. Require the path to be inside <repo>/golden-sets/
  const goldenRoot = path.resolve(getRepoRoot(), "golden-sets") + path.sep;
  return absolute.startsWith(goldenRoot);
}

export function loadGoldenSet(filePath: string): GoldenSetExample[] {
  const absolute = path.resolve(
    path.isAbsolute(filePath) ? filePath : resolveFromRepoRoot(filePath)
  );

  // Reject paths that escape the golden-sets directory
  if (!isWithinGoldenSetsDir(absolute)) {
    return [];
  }

  if (!fs.existsSync(absolute)) return [];
  return parseJsonl(fs.readFileSync(absolute, "utf8"));
}

export function hashGoldenSet(goldenSet: GoldenSetExample[]): string {
  return crypto.createHash("sha256").update(JSON.stringify(goldenSet)).digest("hex").slice(0, 16);
}
