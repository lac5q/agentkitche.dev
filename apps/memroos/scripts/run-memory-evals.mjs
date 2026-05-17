#!/usr/bin/env node

const args = new Set(process.argv.slice(2));
const mode = args.has("--full") ? "full" : args.has("--canary") ? "canary" : "gold";
const baseUrl = (process.env.MEMROOS_MEMROOS_URL || "http://127.0.0.1:3002").replace(/\/$/, "");
const headers = { "Content-Type": "application/json" };

if (process.env.MEMROOS_OPERATOR_API_KEY) {
  headers["x-memroos-operator-key"] = process.env.MEMROOS_OPERATOR_API_KEY;
}

const response = await fetch(`${baseUrl}/api/memory/evals/run?mode=${mode}`, {
  method: "POST",
  headers,
});

const text = await response.text();
let body = {};
try {
  body = text ? JSON.parse(text) : {};
} catch {
  body = { raw: text.slice(0, 1000) };
}
if (!response.ok || body?.run?.status === "failed") {
  console.error(JSON.stringify({ ok: false, status: response.status, url: response.url, body }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(body, null, 2));
