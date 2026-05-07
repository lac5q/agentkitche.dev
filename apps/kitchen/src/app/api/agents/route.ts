import { listRegisteredAgents } from "@/lib/agent-registry";
import { getLocalAgentRuntime } from "@/lib/local-agent-runtime";

export const dynamic = "force-dynamic";

export function GET() {
  const agents = listRegisteredAgents();
  return Response.json({
    agents,
    localRuntime: getLocalAgentRuntime(),
    timestamp: new Date().toISOString(),
  });
}
