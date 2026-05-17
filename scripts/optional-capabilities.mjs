#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const SUPPORTED_OPTIONAL_CAPABILITIES = ["gitnexus", "agent-lightning"];

export function parseOptionalCapabilities(value = "") {
  return Array.from(
    new Set(
      String(value)
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

function commandExists(command, env = process.env) {
  return spawnSync("sh", ["-c", `command -v ${command}`], { stdio: "ignore", env }).status === 0;
}

function readJsonIfPresent(filePath) {
  if (!fs.existsSync(filePath)) return { exists: false, readable: false, data: null };
  try {
    return { exists: true, readable: true, data: JSON.parse(fs.readFileSync(filePath, "utf8")) };
  } catch {
    return { exists: true, readable: false, data: null };
  }
}

export function checkGitNexus({ root = process.cwd(), env = process.env } = {}) {
  const warnings = [];
  const mcpPath = path.join(root, ".mcp.json");
  const registryPath = env.GITNEXUS_REGISTRY || path.join(env.HOME || "", ".gitnexus", "registry.json");
  const mcp = readJsonIfPresent(mcpPath);
  const registry = readJsonIfPresent(registryPath);
  const hasCli = commandExists("gitnexus", env);
  const hasMcpRegistration = Boolean(mcp.data?.mcpServers?.gitnexus);

  if (!hasCli) warnings.push("GitNexus CLI not found. Install it or remove gitnexus from MEMROOS_OPTIONAL_CAPABILITIES.");
  if (!mcp.exists) warnings.push("Missing .mcp.json; GitNexus will not appear as an MCP server.");
  else if (!mcp.readable) warnings.push(".mcp.json is not valid JSON; cannot verify GitNexus MCP registration.");
  else if (!hasMcpRegistration) warnings.push(".mcp.json does not register mcpServers.gitnexus.");
  if (registry.exists && !registry.readable) warnings.push(`GitNexus registry is present but unreadable: ${registryPath}`);
  if (!registry.exists) warnings.push(`GitNexus registry not found yet: ${registryPath}. Run gitnexus analyze in a repo to create indexes.`);

  return {
    id: "gitnexus",
    status: hasCli && hasMcpRegistration && registry.readable ? "available" : hasCli || hasMcpRegistration ? "degraded" : "missing",
    warnings,
  };
}

export function checkAgentLightning({ root = process.cwd(), env = process.env } = {}) {
  const warnings = [];
  const home = env.HOME || "";
  const proposalsPath = env.APO_PROPOSALS_PATH || path.join(home, ".openclaw", "skills", "proposals");
  const cronLogPath = env.APO_CRON_LOG_PATH || path.join(home, ".openclaw", "logs", "agent-lightning-cron.log");
  const packagePath = path.join(root, "apps", "memroos", "package.json");
  const rootCurateScript = path.join(root, "scripts", "curate-agent-skills.mjs");
  const rootInstallScript = path.join(root, "scripts", "install-skill-curation-launchd.mjs");
  const packageJson = readJsonIfPresent(packagePath);
  const hasWorker = Boolean(packageJson.data?.scripts?.["apo:worker"]);
  const proposalsExist = fs.existsSync(proposalsPath);
  const cronLogExists = fs.existsSync(cronLogPath);

  if (!hasWorker) warnings.push("apps/memroos package.json does not define apo:worker.");
  if (!proposalsExist) warnings.push(`APO proposals path not found yet: ${proposalsPath}`);
  if (!cronLogExists) warnings.push(`APO cron log not found yet: ${cronLogPath}`);
  if (!fs.existsSync(rootCurateScript)) warnings.push("Root script missing: scripts/curate-agent-skills.mjs.");
  if (!fs.existsSync(rootInstallScript)) warnings.push("Root script missing: scripts/install-skill-curation-launchd.mjs.");

  return {
    id: "agent-lightning",
    status: hasWorker && proposalsExist && cronLogExists ? "available" : hasWorker ? "degraded" : "missing",
    warnings,
  };
}

export function checkOptionalCapabilities({ value = process.env.MEMROOS_OPTIONAL_CAPABILITIES || "", root = process.cwd(), env = process.env } = {}) {
  return parseOptionalCapabilities(value).map((capability) => {
    if (capability === "gitnexus") return checkGitNexus({ root, env });
    if (capability === "agent-lightning") return checkAgentLightning({ root, env });
    return {
      id: capability,
      status: "missing",
      warnings: [`Unsupported optional capability: ${capability}. Supported: ${SUPPORTED_OPTIONAL_CAPABILITIES.join(", ")}.`],
    };
  });
}

export function printOptionalCapabilityReport(results) {
  if (!results.length) return;
  console.log("Optional capability checks:");
  for (const result of results) {
    console.log(`- ${result.id}: ${result.status}`);
    for (const warning of result.warnings) console.warn(`  warning: ${warning}`);
  }
}

function main() {
  const results = checkOptionalCapabilities();
  printOptionalCapabilityReport(results);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
