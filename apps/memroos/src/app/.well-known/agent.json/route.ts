import { buildMemroosAgentCard } from "@/lib/a2a/agent-card";

export const dynamic = "force-dynamic";

export async function GET() {
  const card = buildMemroosAgentCard();

  return Response.json({
    ...card,
    extensions: {
      ...card.extensions,
      memroos: {
        ...card.extensions.memroos,
        compatibilityAlias: true,
      },
    },
  });
}
