/**
 * Phase 61 — POST /api/l3/poll: trigger adapter poll (auth-gated)
 *
 * Body: { since?: string (ISO date), adapters?: string[] (adapter names to run) }
 * Runs pollAllAdapters with the registered live adapters.
 */

import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";
import { createHubSpotAdapter } from "@/lib/l3/adapters/hubspot";
import { createIntercomAdapter } from "@/lib/l3/adapters/intercom";
import { createQuickBooksAdapter } from "@/lib/l3/adapters/quickbooks";
import { pollAllAdapters } from "@/lib/l3/poller";
import type { BusinessSystemAdapter } from "@/lib/l3/adapter-interface";

export const dynamic = "force-dynamic";

/** Default registered live adapters (mock=false for production). */
function getDefaultAdapters(): BusinessSystemAdapter[] {
  return [
    createHubSpotAdapter({ mock: false }),
    createIntercomAdapter({ mock: false }),
    createQuickBooksAdapter({ mock: false }),
  ];
}

export async function POST(req: NextRequest) {
  if (!authorizeRegistryWrite(req)) {
    return registryWriteUnauthorizedResponse();
  }

  const body = (await req.json().catch(() => null)) as {
    since?: string;
    adapters?: string[];
  } | null;

  const since = body?.since ? new Date(body.since) : new Date(Date.now() - 5 * 60 * 1000);
  const requestedAdapters = body?.adapters ?? null;

  let adapters = getDefaultAdapters();
  if (requestedAdapters && requestedAdapters.length > 0) {
    adapters = adapters.filter((a) => requestedAdapters.includes(a.name));
  }

  if (adapters.length === 0) {
    return Response.json({ error: "No matching adapters found" }, { status: 400 });
  }

  try {
    const db = getDb();
    const summary = await pollAllAdapters(adapters, db, since);

    return Response.json({
      ok: true,
      ...summary,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Poll failed" },
      { status: 500 }
    );
  }
}
