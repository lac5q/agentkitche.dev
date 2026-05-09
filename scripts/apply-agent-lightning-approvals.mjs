#!/usr/bin/env node

const DEFAULT_URL = process.env.KITCHEN_URL || "http://localhost:3002";
const DEFAULT_EXECUTOR = process.env.APO_APPROVAL_CLI || "qwen";

function parseArgs(argv) {
  const args = {
    url: DEFAULT_URL,
    executorCli: DEFAULT_EXECUTOR,
    proposalId: null,
    limit: null,
    dryRun: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--url" && next) {
      args.url = next;
      index += 1;
    } else if (arg === "--executor" && next) {
      args.executorCli = next;
      index += 1;
    } else if (arg === "--proposal" && next) {
      args.proposalId = next;
      index += 1;
    } else if (arg === "--limit" && next) {
      args.limit = Number(next);
      index += 1;
    } else if (arg === "--dry-run") {
      args.dryRun = true;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log(`Agent Lightning approval worker

Usage:
  npm --prefix apps/kitchen run apo:worker -- [options]

Options:
  --executor <cli>   CLI assigned to implementation work. Default: ${DEFAULT_EXECUTOR}
  --proposal <id>    Apply one approved proposal instead of the whole queue.
  --limit <n>        Process at most n queued proposals.
  --url <url>        Kitchen base URL. Default: ${DEFAULT_URL}
  --dry-run          Print the request without applying queued work.
  --help             Show this help.

Environment:
  KITCHEN_OPERATOR_API_KEY is sent as the bearer token when present.
  APO_APPROVAL_CLI sets the default executor CLI, e.g. qwen, codex, claude.
`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const payload = args.proposalId
    ? { action: "apply-approved", proposalId: args.proposalId, executorCli: args.executorCli }
    : { action: "process-approved", limit: args.limit, executorCli: args.executorCli };

  const endpoint = new URL("/api/apo", args.url).toString();
  if (args.dryRun) {
    console.log(JSON.stringify({ endpoint, payload }, null, 2));
    return;
  }

  const headers = { "content-type": "application/json" };
  if (process.env.KITCHEN_OPERATOR_API_KEY) {
    headers.authorization = `Bearer ${process.env.KITCHEN_OPERATOR_API_KEY}`;
  }
  // Force Host header to localhost for registry write authorization check
  if (args.url.includes("localhost")) {
    headers.host = "localhost:3002";
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok || body?.ok === false) {
    console.error(JSON.stringify(body ?? { error: response.statusText }, null, 2));
    process.exit(1);
  }

  console.log(JSON.stringify(body, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
