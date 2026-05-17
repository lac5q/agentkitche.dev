import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";

import { resolveFromRepoRoot } from "@/lib/paths";

export type ContextSourceType = "qmd" | "gmail" | "spark" | "mem0" | "local-folder";
export type ContextSourceStatus = "ok" | "stale" | "missing" | "degraded" | "disabled";
export type SafeAnswerPolicy = "source_required" | "degrade_with_warning" | "optional";

export interface ContextSourceContract {
  id: string;
  type: ContextSourceType;
  enabled: boolean;
  requiredTools: string[];
  envVars: string[];
  sourcePath: string;
  ingestCommand: string | null;
  indexCommand: string | null;
  freshnessThresholdMinutes: number;
  qmdCollection: string | null;
  safeAnswerPolicy: SafeAnswerPolicy;
}

export interface ContextSourcesConfig {
  sources: ContextSourceContract[];
}

export interface ContextSourceHealth {
  id: string;
  type: ContextSourceType;
  status: ContextSourceStatus;
  enabled: boolean;
  lastRun: string | null;
  ageMinutes: number | null;
  documentCount: number;
  qmdCollection: string | null;
  lastIndexedMarker: string | null;
  lastError: string | null;
  repairHint: string;
  safeAnswerPolicy: SafeAnswerPolicy;
}

export interface ContextHealthResponse {
  sources: ContextSourceHealth[];
  timestamp: string;
}

export interface SourceGateResult {
  ok: boolean;
  code?: "SOURCE_STALE" | "SOURCE_MISSING";
  sourceId?: string;
  message?: string;
}

interface EvaluatorDeps {
  now?: Date;
  exists?: (target: string) => boolean;
  stat?: (target: string) => fs.Stats;
  countDocs?: (target: string) => number;
  hasTool?: (tool: string) => boolean;
}

const CONFIG_PATH = "context-sources.config.json";
const DOC_EXTENSIONS = new Set([".md", ".mdx", ".txt", ".json", ".jsonl"]);

function resolveConfigPath(filename?: string): string {
  const configured = filename ?? process.env.CONTEXT_SOURCES_CONFIG ?? CONFIG_PATH;
  return path.isAbsolute(configured) ? configured : resolveFromRepoRoot(configured);
}

function expandPath(input: string): string {
  return input.replace(/\$\{([A-Z0-9_]+)(?::-(.*?))?\}/g, (_match, key: string, fallback: string) => {
    return process.env[key] ?? fallback ?? "";
  });
}

function resolveSourcePath(sourcePath: string): string {
  const expanded = expandPath(sourcePath);
  return path.isAbsolute(expanded) ? expanded : resolveFromRepoRoot(expanded);
}

function defaultHasTool(tool: string): boolean {
  try {
    execFileSync("command", ["-v", tool], { shell: "/bin/sh", stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function defaultCountDocs(target: string): number {
  if (!fs.existsSync(target)) return 0;
  const stat = fs.statSync(target);
  if (stat.isFile()) return DOC_EXTENSIONS.has(path.extname(target).toLowerCase()) ? 1 : 0;
  let count = 0;
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) count += defaultCountDocs(child);
    else if (DOC_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) count += 1;
  }
  return count;
}

export function loadContextSourceContracts(filename?: string): ContextSourcesConfig {
  const raw = fs.readFileSync(resolveConfigPath(filename), "utf8");
  return JSON.parse(raw) as ContextSourcesConfig;
}

export function evaluateContextSources(
  config: ContextSourcesConfig,
  deps: EvaluatorDeps = {}
): ContextHealthResponse {
  const now = deps.now ?? new Date();
  const exists = deps.exists ?? fs.existsSync;
  const stat = deps.stat ?? fs.statSync;
  const countDocs = deps.countDocs ?? defaultCountDocs;
  const hasTool = deps.hasTool ?? defaultHasTool;

  const sources = config.sources.map((source): ContextSourceHealth => {
    const resolvedPath = resolveSourcePath(source.sourcePath);
    if (!source.enabled) {
      return {
        id: source.id,
        type: source.type,
        status: "disabled",
        enabled: false,
        lastRun: null,
        ageMinutes: null,
        documentCount: 0,
        qmdCollection: source.qmdCollection,
        lastIndexedMarker: null,
        lastError: null,
        repairHint: `Enable source ${source.id} in context-sources.config.json`,
        safeAnswerPolicy: source.safeAnswerPolicy,
      };
    }

    const missingTools = source.requiredTools.filter((tool) => !hasTool(tool));
    const missingEnv = source.envVars.filter((name) => !process.env[name] && !source.sourcePath.includes(`${name}:-`));
    if (missingTools.length || missingEnv.length) {
      return {
        id: source.id,
        type: source.type,
        status: "degraded",
        enabled: true,
        lastRun: null,
        ageMinutes: null,
        documentCount: 0,
        qmdCollection: source.qmdCollection,
        lastIndexedMarker: null,
        lastError: [...missingTools.map((tool) => `missing tool: ${tool}`), ...missingEnv.map((env) => `missing env: ${env}`)].join("; "),
        repairHint: source.ingestCommand ?? source.indexCommand ?? `Configure ${source.id}`,
        safeAnswerPolicy: source.safeAnswerPolicy,
      };
    }

    if (!exists(resolvedPath)) {
      return {
        id: source.id,
        type: source.type,
        status: "missing",
        enabled: true,
        lastRun: null,
        ageMinutes: null,
        documentCount: 0,
        qmdCollection: source.qmdCollection,
        lastIndexedMarker: null,
        lastError: `missing source path: ${resolvedPath}`,
        repairHint: `Create or mount ${source.sourcePath}`,
        safeAnswerPolicy: source.safeAnswerPolicy,
      };
    }

    const stats = stat(resolvedPath);
    const ageMinutes = Math.max(0, Math.round((now.getTime() - stats.mtime.getTime()) / 60000));
    const status: ContextSourceStatus =
      ageMinutes > source.freshnessThresholdMinutes ? "stale" : "ok";

    return {
      id: source.id,
      type: source.type,
      status,
      enabled: true,
      lastRun: stats.mtime.toISOString(),
      ageMinutes,
      documentCount: countDocs(resolvedPath),
      qmdCollection: source.qmdCollection,
      lastIndexedMarker: stats.mtime.toISOString(),
      lastError: status === "stale" ? `source older than ${source.freshnessThresholdMinutes} minutes` : null,
      repairHint: status === "stale" ? (source.ingestCommand ?? source.indexCommand ?? `Refresh ${source.id}`) : "No action required",
      safeAnswerPolicy: source.safeAnswerPolicy,
    };
  });

  return { sources, timestamp: now.toISOString() };
}

export function requireFreshContextSources(
  health: ContextHealthResponse,
  requiredSourceIds: string[]
): SourceGateResult {
  for (const sourceId of requiredSourceIds) {
    const source = health.sources.find((item) => item.id === sourceId);
    if (!source || source.status === "missing" || source.status === "disabled") {
      return { ok: false, code: "SOURCE_MISSING", sourceId, message: `Required source ${sourceId} is unavailable` };
    }
    if (source.status === "stale" || source.status === "degraded") {
      return { ok: false, code: "SOURCE_STALE", sourceId, message: `Required source ${sourceId} is ${source.status}` };
    }
  }
  return { ok: true };
}
