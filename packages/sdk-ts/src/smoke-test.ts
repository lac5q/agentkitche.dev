/**
 * @memoroos/eval-sdk smoke test
 *
 * Submits a sample trace to the MemroOS Public Eval API and prints the W score.
 * Exits 0 on success, 1 on error.
 *
 * Usage:
 *   MEMROOS_API_KEY=<key> MEMROOS_BASE_URL=http://localhost:3000 \
 *     node dist/smoke-test.js
 */

import { MemroosClient, MemroosApiError } from "./client";
import sampleTrace from "./fixtures/sample-trace.json";

async function main(): Promise<void> {
  const baseUrl = process.env.MEMROOS_BASE_URL ?? "http://localhost:3000";
  const apiKey = process.env.MEMROOS_API_KEY ?? "";

  if (!apiKey) {
    console.error("ERROR: MEMROOS_API_KEY environment variable is required");
    process.exit(1);
  }

  const client = new MemroosClient({ baseUrl, apiKey });

  console.log(`Submitting sample trace to ${baseUrl}...`);
  try {
    const result = await client.submitTrace(sampleTrace);
    console.log("W score:", result.w);
    console.log("Run ID:", result.runId);
    console.log("Layers:", JSON.stringify(result.layers, null, 2));

    if (typeof result.w !== "number") {
      console.error("ERROR: W score is not a number");
      process.exit(1);
    }

    console.log("Smoke test passed.");
    process.exit(0);
  } catch (err) {
    if (err instanceof MemroosApiError) {
      console.error(`API error ${err.status}:`, err.message);
    } else {
      console.error("Unexpected error:", err);
    }
    process.exit(1);
  }
}

main();
