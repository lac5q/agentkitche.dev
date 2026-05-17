import { evaluateContextSources, loadContextSourceContracts } from "@/lib/context-sources";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const health = evaluateContextSources(loadContextSourceContracts());
    return Response.json(health);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Failed to evaluate context sources" },
      { status: 500 }
    );
  }
}
