import { ingestA2aAgentCard } from "@/lib/a2a/card-ingestion";
import { A2aError, a2aErrorResponse } from "@/lib/a2a/errors";
import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";

export const dynamic = "force-dynamic";

type RegistrationSource = "adk" | "a2a" | "manual";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseSource(value: unknown): RegistrationSource | undefined {
  return value === "adk" || value === "a2a" || value === "manual" ? value : undefined;
}

export async function POST(request: Request) {
  if (!authorizeRegistryWrite(request)) {
    return registryWriteUnauthorizedResponse();
  }

  const body = (await request.json().catch(() => null)) as unknown;
  if (!isRecord(body) || typeof body.cardUrl !== "string" || !body.cardUrl.trim()) {
    return Response.json(
      { ok: false, error: "cardUrl is required", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  try {
    const result = await ingestA2aAgentCard({
      cardUrl: body.cardUrl,
      requestedId: typeof body.requestedId === "string" ? body.requestedId : undefined,
      source: parseSource(body.source),
      issueApiKey: typeof body.issueApiKey === "boolean" ? body.issueApiKey : undefined,
    });

    return Response.json({ ok: true, ...result, timestamp: new Date().toISOString() });
  } catch (error) {
    if (error instanceof A2aError) {
      return a2aErrorResponse(error);
    }

    return Response.json(
      { ok: false, error: "A2A agent card registration failed", code: "INTERNAL" },
      { status: 500 }
    );
  }
}
