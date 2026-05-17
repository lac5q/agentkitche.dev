#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const launchAgentsDir = path.join(os.homedir(), "Library", "LaunchAgents");
const uid = process.getuid?.() ?? "";
const domain = `gui/${uid}`;

const jobs = [
  {
    label: "com.memroos.memory-healthcheck",
    args: ["/bin/bash", path.join(root, "services", "memory", "healthcheck.sh")],
    stdout: path.join(root, "services", "memory", "logs", "healthcheck-launchd.log"),
    stderr: path.join(root, "services", "memory", "logs", "healthcheck-launchd-error.log"),
    interval: 300,
    runAtLoad: true,
    env: {
      PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
      MEM0_ENV_FILE: path.join(root, "services", "memory", ".env"),
      MEM0_LOG_DIR: path.join(root, "services", "memory", "logs"),
      MEMORY_HEALTHCHECK_ONLY: "1",
    },
  },
  {
    label: "com.memroos.memory-degradation-evals",
    args: ["/bin/bash", path.join(root, "scripts", "run-memory-degradation-checks.sh")],
    stdout: path.join(root, "services", "memory", "logs", "memory-degradation-evals.log"),
    stderr: path.join(root, "services", "memory", "logs", "memory-degradation-evals-error.log"),
    calendar: { Hour: 9, Minute: 15 },
    env: {
      PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
    },
  },
];

function xmlEscape(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function dictEntry(key, value) {
  if (typeof value === "number") {
    return `        <key>${key}</key>\n        <integer>${value}</integer>`;
  }
  return `        <key>${key}</key>\n        <string>${xmlEscape(value)}</string>`;
}

function renderJob(job) {
  const argsXml = job.args.map((arg) => `        <string>${xmlEscape(arg)}</string>`).join("\n");
  const envXml = Object.entries(job.env)
    .map(([key, value]) => `        <key>${key}</key>\n        <string>${xmlEscape(value)}</string>`)
    .join("\n");
  const triggerXml = job.interval
    ? `    <key>StartInterval</key>\n    <integer>${job.interval}</integer>`
    : `    <key>StartCalendarInterval</key>\n    <dict>\n${dictEntry("Hour", job.calendar.Hour)}\n${dictEntry("Minute", job.calendar.Minute)}\n    </dict>`;
  const runAtLoadXml = job.runAtLoad ? "\n    <key>RunAtLoad</key>\n    <true/>" : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${job.label}</string>

    <key>ProgramArguments</key>
    <array>
${argsXml}
    </array>

${triggerXml}${runAtLoadXml}

    <key>StandardOutPath</key>
    <string>${xmlEscape(job.stdout)}</string>

    <key>StandardErrorPath</key>
    <string>${xmlEscape(job.stderr)}</string>

    <key>EnvironmentVariables</key>
    <dict>
${envXml}
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

function requireMacOs() {
  if (process.platform !== "darwin") {
    console.log("Memory resilience launchd jobs are macOS-only; skipping.");
    return false;
  }
  return true;
}

function lintPlists(dir) {
  for (const job of jobs) {
    run("plutil", ["-lint", plistPath(job, dir)], { stdio: "inherit" });
  }
}

function check() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "memroos-memory-resilience-"));
  try {
    for (const job of jobs) {
      fs.writeFileSync(plistPath(job, tmp), renderJob(job));
    }
    if (process.platform === "darwin") lintPlists(tmp);
    console.log("Memory resilience installer check passed");
  } finally {
    fs.rmSync(tmp, { force: true, recursive: true });
  }
}

function install() {
  if (!requireMacOs()) return;
  fs.mkdirSync(launchAgentsDir, { recursive: true });
  fs.mkdirSync(path.join(root, "services", "memory", "logs"), { recursive: true });
  for (const job of jobs) {
    const target = plistPath(job);
    fs.writeFileSync(target, renderJob(job));
    run("plutil", ["-lint", target], { stdio: "inherit" });
    run("launchctl", ["bootout", domain, target], { stdio: "ignore" });
    run("launchctl", ["bootstrap", domain, target], { stdio: "inherit" });
    if (job.runAtLoad) {
      run("launchctl", ["kickstart", "-k", `${domain}/${job.label}`], { stdio: "inherit" });
    }
  }
  console.log("Installed Memoroos memory resilience jobs.");
}

function uninstall() {
  if (!requireMacOs()) return;
  for (const job of jobs) {
    const target = plistPath(job);
    run("launchctl", ["bootout", domain, target], { stdio: "ignore" });
    fs.rmSync(target, { force: true });
  }
  console.log("Uninstalled Memoroos memory resilience jobs.");
}

function status() {
  if (!requireMacOs()) return;
  const output = run("launchctl", ["list"]);
  for (const job of jobs) {
    const line = output.split("\n").find((item) => item.includes(job.label));
    console.log(line || `- not loaded ${job.label}`);
  }
}

const command = process.argv[2] || "install";
if (command === "check") check();
else if (command === "install") install();
else if (command === "status") status();
else if (command === "uninstall") uninstall();
else {
  console.error("Usage: node scripts/install-memory-resilience.mjs [install|status|uninstall|check]");
  process.exit(1);
}
