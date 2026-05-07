#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  checkAgentLightning,
  checkGitNexus,
  checkOptionalCapabilities,
  parseOptionalCapabilities,
} from "./optional-capabilities.mjs";

function tempRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "optional-capabilities-"));
}

test("parseOptionalCapabilities handles empty, single, and comma-separated values", () => {
  assert.deepEqual(parseOptionalCapabilities(""), []);
  assert.deepEqual(parseOptionalCapabilities("gitnexus"), ["gitnexus"]);
  assert.deepEqual(parseOptionalCapabilities(" gitnexus, agent-lightning,gitnexus "), ["gitnexus", "agent-lightning"]);
});

test("checkOptionalCapabilities warns but returns results for unsupported capabilities", () => {
  const results = checkOptionalCapabilities({ value: "missing-thing", root: tempRoot(), env: { HOME: os.tmpdir() } });
  assert.equal(results[0].status, "missing");
  assert.match(results[0].warnings[0], /Unsupported optional capability/);
});

test("checkGitNexus reports available when cli, MCP config, and registry are present", () => {
  const root = tempRoot();
  const home = path.join(root, "home");
  const bin = path.join(root, "bin");
  fs.mkdirSync(path.join(home, ".gitnexus"), { recursive: true });
  fs.mkdirSync(bin, { recursive: true });
  fs.writeFileSync(path.join(bin, "gitnexus"), "#!/usr/bin/env sh\nexit 0\n");
  fs.chmodSync(path.join(bin, "gitnexus"), 0o755);
  fs.writeFileSync(path.join(root, ".mcp.json"), JSON.stringify({ mcpServers: { gitnexus: { command: "gitnexus" } } }));
  fs.writeFileSync(path.join(home, ".gitnexus", "registry.json"), "{}");

  const result = checkGitNexus({ root, env: { HOME: home, PATH: `${bin}${path.delimiter}${process.env.PATH}` } });
  assert.equal(result.status, "available");
  assert.deepEqual(result.warnings, []);
});

test("checkAgentLightning reports degraded when worker exists but supporting paths/scripts are missing", () => {
  const root = tempRoot();
  fs.mkdirSync(path.join(root, "apps", "kitchen"), { recursive: true });
  fs.writeFileSync(path.join(root, "apps", "kitchen", "package.json"), JSON.stringify({ scripts: { "apo:worker": "node worker.js" } }));

  const result = checkAgentLightning({ root, env: { HOME: path.join(root, "home") } });
  assert.equal(result.status, "degraded");
  assert.ok(result.warnings.some((warning) => warning.includes("APO proposals path not found")));
  assert.ok(result.warnings.some((warning) => warning.includes("scripts/curate-agent-skills.mjs")));
});
