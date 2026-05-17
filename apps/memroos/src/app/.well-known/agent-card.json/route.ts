import { buildMemroosAgentCard } from "@/lib/a2a/agent-card";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(buildMemroosAgentCard());
}
