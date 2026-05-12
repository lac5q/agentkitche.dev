import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface MiddlewareConfig {
  enabled: boolean;
  skip: string[];
}

export interface ToolMiddlewareParams<TInput extends Record<string, unknown>, TOutput> {
  hermesRoot?: string;
  toolName: string;
  input: TInput;
  requiredFields?: string[];
  execute: (input: TInput) => Promise<TOutput> | TOutput;
}

export interface ToolMiddlewareResult<TOutput> {
  ok: boolean;
  output?: TOutput;
  error?: string;
  errorType?: "timeout" | "api_error" | "validation_error";
  durationMs: number;
  inputHash: string;
  middlewareOrder: string[];
}

const DEFAULT_SECRET_PATTERNS = [
  "sk-[A-Za-z0-9_-]+",
  "ak_[A-Za-z0-9_-]+",
  "Bearer\\s+[A-Za-z0-9._~+/=-]+",
  "\"?(?:api[_-]?key|token|secret)\"?\\s*[:=]\\s*\"[^\"]+\"",
];

function homeHermesRoot(): string {
  return path.join(process.env.HOME ?? process.cwd(), ".hermes");
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true });
}

function writeIfMissing(filePath: string, content: string): void {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, content);
}

function nowIso(): string {
  return new Date().toISOString();
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
}

function hashInput(value: unknown): string {
  return crypto.createHash("sha256").update(stableStringify(value)).digest("hex");
}

function appendJsonl(filePath: string, value: Record<string, unknown>): void {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${JSON.stringify(value)}\n`);
}

function configPath(root: string): string {
  return path.join(root, "config.json");
}

function secretPatternPath(root: string): string {
  return path.join(root, "middleware", "secret-patterns.json");
}

export function createDefaultMiddlewareFiles(
  hermesRoot = homeHermesRoot(),
  config: MiddlewareConfig = { enabled: true, skip: [] }
): void {
  ensureDir(path.join(hermesRoot, "middleware", "pre"));
  ensureDir(path.join(hermesRoot, "middleware", "post"));
  ensureDir(path.join(hermesRoot, "logs"));

  writeIfMissing(configPath(hermesRoot), JSON.stringify({ middleware: config }, null, 2));
  writeIfMissing(secretPatternPath(hermesRoot), JSON.stringify(DEFAULT_SECRET_PATTERNS, null, 2));
  writeIfMissing(path.join(hermesRoot, "middleware", "pre", "01-validate-input.py"), "def on_pre_call(ctx):\n    return ctx\n");
  writeIfMissing(path.join(hermesRoot, "middleware", "pre", "02-redact-secrets.py"), "def on_pre_call(ctx):\n    return ctx\n");
  writeIfMissing(path.join(hermesRoot, "middleware", "post", "01-log-outcome.py"), "def on_post_call(ctx):\n    return ctx\n");
  writeIfMissing(path.join(hermesRoot, "middleware", "post", "02-skill-health.py"), "def on_post_call(ctx):\n    return ctx\n");
}

function readConfig(root: string): MiddlewareConfig {
  try {
    const raw = JSON.parse(fs.readFileSync(configPath(root), "utf8")) as {
      middleware?: Partial<MiddlewareConfig>;
    };
    return {
      enabled: raw.middleware?.enabled !== false,
      skip: Array.isArray(raw.middleware?.skip) ? raw.middleware.skip.map(String) : [],
    };
  } catch {
    return { enabled: true, skip: [] };
  }
}

function readSecretPatterns(root: string): RegExp[] {
  try {
    const raw = JSON.parse(fs.readFileSync(secretPatternPath(root), "utf8")) as unknown;
    if (Array.isArray(raw)) return raw.map((pattern) => new RegExp(String(pattern), "gi"));
  } catch {
    // fall through to defaults
  }
  return DEFAULT_SECRET_PATTERNS.map((pattern) => new RegExp(pattern, "gi"));
}

function redact(value: unknown, patterns: RegExp[]): unknown {
  if (typeof value === "string") {
    return patterns.reduce((text, pattern) => text.replace(pattern, "[REDACTED]"), value);
  }
  if (Array.isArray(value)) return value.map((item) => redact(item, patterns));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, redact(entry, patterns)])
    );
  }
  return value;
}

function errorType(error: unknown): "timeout" | "api_error" | "validation_error" {
  if (error instanceof Error && /timeout/i.test(error.message)) return "timeout";
  return "api_error";
}

function updateFailureHealth(root: string, toolName: string, ok: boolean): void {
  const statePath = path.join(root, "logs", "skill-health-state.json");
  const alertsPath = path.join(root, "logs", "skill-health-alerts.jsonl");
  let state: Record<string, { failures: number; alerted: boolean }> = {};
  try {
    state = JSON.parse(fs.readFileSync(statePath, "utf8")) as typeof state;
  } catch {
    state = {};
  }

  const current = state[toolName] ?? { failures: 0, alerted: false };
  if (ok) {
    state[toolName] = { failures: 0, alerted: false };
  } else {
    const next = { failures: current.failures + 1, alerted: current.alerted };
    if (next.failures >= 3 && !next.alerted) {
      appendJsonl(alertsPath, {
        timestamp: nowIso(),
        skill: toolName,
        failures: next.failures,
        reason: "three_consecutive_failures",
      });
      next.alerted = true;
    }
    state[toolName] = next;
  }
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function skipped(config: MiddlewareConfig, id: string): boolean {
  return config.skip.some((skip) => id.includes(skip));
}

export async function runToolWithMiddleware<TInput extends Record<string, unknown>, TOutput>(
  params: ToolMiddlewareParams<TInput, TOutput>
): Promise<ToolMiddlewareResult<TOutput>> {
  const root = params.hermesRoot ?? homeHermesRoot();
  createDefaultMiddlewareFiles(root);
  const config = readConfig(root);
  const started = Date.now();
  const inputHash = hashInput(params.input);
  const order: string[] = [];

  if (!config.enabled) {
    try {
      const output = await params.execute(params.input);
      return { ok: true, output, durationMs: Date.now() - started, inputHash, middlewareOrder: order };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Tool call failed",
        errorType: errorType(error),
        durationMs: Date.now() - started,
        inputHash,
        middlewareOrder: order,
      };
    }
  }

  if (!skipped(config, "01-validate-input")) {
    order.push("pre/01-validate-input");
    const missing = (params.requiredFields ?? []).filter((field) => params.input[field] === undefined || params.input[field] === "");
    if (missing.length > 0) {
      const durationMs = Date.now() - started;
      const result: ToolMiddlewareResult<TOutput> = {
        ok: false,
        error: `Missing required fields: ${missing.join(", ")}`,
        errorType: "validation_error",
        durationMs,
        inputHash,
        middlewareOrder: order,
      };
      appendJsonl(path.join(root, "logs", "tool-outcomes.jsonl"), {
        timestamp: nowIso(),
        tool: params.toolName,
        inputHash,
        loggedInput: redact(params.input, readSecretPatterns(root)),
        success: false,
        errorType: result.errorType,
        duration_ms: durationMs,
      });
      return result;
    }
  }

  const patterns = readSecretPatterns(root);
  let loggedInput: unknown = params.input;
  if (!skipped(config, "02-redact-secrets")) {
    order.push("pre/02-redact-secrets");
    loggedInput = redact(params.input, patterns);
  }

  let ok = false;
  let output: TOutput | undefined;
  let errorMessage: string | undefined;
  let type: "timeout" | "api_error" | "validation_error" | undefined;
  try {
    output = await params.execute(params.input);
    ok = true;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Tool call failed";
    type = errorType(error);
  }

  const durationMs = Date.now() - started;
  if (!skipped(config, "01-log-outcome")) {
    order.push("post/01-log-outcome");
    appendJsonl(path.join(root, "logs", "tool-outcomes.jsonl"), {
      timestamp: nowIso(),
      tool: params.toolName,
      inputHash,
      loggedInput,
      success: ok,
      errorType: type ?? null,
      duration_ms: durationMs,
    });
  }
  if (!skipped(config, "02-skill-health")) {
    order.push("post/02-skill-health");
    updateFailureHealth(root, params.toolName, ok);
  }

  return ok
    ? { ok, output, durationMs, inputHash, middlewareOrder: order }
    : { ok, error: errorMessage, errorType: type, durationMs, inputHash, middlewareOrder: order };
}
