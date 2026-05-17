#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const launchAgentsDir = path.join(os.homedir(), "Library", "LaunchAgents");
const uid = process.getuid?.() ?? "";
const domain = `gui/${uid}`;
const envFile = path.join(root, ".env");

const jobs = [
  {
    label: "com.memroos.context-health",
    args: ["/usr/bin/env", "npm", "run", "eval:context-sources"],
    stdout: path.join(root, "services", "memory", "logs", "context-health.log"),
    stderr: path.join(root, "services", "memory", "logs", "context-health-error.log"),
    interval: 900,
  },
];

function xmlEscape(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function renderJob(job) {
  const argsXml = job.args.map((arg) => `        <string>${xmlEscape(arg)}</string>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${job.label}</string>
    <key>WorkingDirectory</key>
    <string>${xmlEscape(root)}</string>
    <key>ProgramArguments</key>
    <array>
${argsXml}
    </array>
    <key>StartInterval</key>
    <integer>${job.interval}</integer>
    <key>StandardOutPath</key>
    <string>${xmlEscape(job.stdout)}</string>
    <key>StandardErrorPath</key>
    <string>${xmlEscape(job.stderr)}</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>MEMROOS_ENV_FILE</key>
        <string>${xmlEscape(envFile)}</string>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
`;
}

function plistPath(job, dir = launchAgentsDir) {
  return path.join(dir, `${job.label}.plist`);
}

function run(command, args, options = {}) {
  return execFileSync(command, args, { encoding: "utf8", stdio: options.stdio ?? "pipe" });
}

function tryRun(command, args, options = {}) {
  try {
    return run(command, args, options);
  } catch {
    return "";
  }
}

function check() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "memroos-runtime-services-"));
  try {
    for (const job of jobs) fs.writeFileSync(plistPath(job, tmp), renderJob(job));
    if (process.platform === "darwin") {
      for (const job of jobs) run("plutil", ["-lint", plistPath(job, tmp)], { stdio: "inherit" });
    }
    console.log("Runtime service installer check passed");
  } finally {
    fs.rmSync(tmp, { force: true, recursive: true });
  }
}

function install() {
  if (process.platform !== "darwin") {
    console.log("Runtime services launchd install is macOS-only; skipping.");
    return;
  }
  fs.mkdirSync(launchAgentsDir, { recursive: true });
  fs.mkdirSync(path.join(root, "services", "memory", "logs"), { recursive: true });
  for (const job of jobs) {
    const target = plistPath(job);
    fs.writeFileSync(target, renderJob(job));
    run("plutil", ["-lint", target], { stdio: "inherit" });
    tryRun("launchctl", ["bootout", domain, target], { stdio: "ignore" });
    run("launchctl", ["bootstrap", domain, target], { stdio: "inherit" });
  }
}

function uninstall() {
  if (process.platform !== "darwin") return;
  for (const job of jobs) {
    const target = plistPath(job);
    tryRun("launchctl", ["bootout", domain, target], { stdio: "ignore" });
    fs.rmSync(target, { force: true });
  }
}

function status() {
  if (process.platform !== "darwin") {
    console.log("Runtime service status is macOS launchd-specific.");
    return;
  }
  const output = run("launchctl", ["list"]);
  for (const job of jobs) console.log(output.split("\n").find((line) => line.includes(job.label)) || `- not loaded ${job.label}`);
}

const command = process.argv[2] || "check";
if (command === "check") check();
else if (command === "install") install();
else if (command === "uninstall") uninstall();
else if (command === "status") status();
else {
  console.error("Usage: node scripts/install-runtime-services.mjs [check|install|uninstall|status]");
  process.exit(1);
}
