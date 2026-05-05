import { buildKitchenAgentCard } from "@/lib/a2a/agent-card";

export const dynamic = "force-dynamic";

export async function GET() {
  const card = buildKitchenAgentCard();

  return Response.json({
    ...card,
    extensions: {
      ...card.extensions,
      kitchen: {
        ...card.extensions.kitchen,
        compatibilityAlias: true,
      },
    },
  });
}
