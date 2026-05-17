import { listRegisteredAgents } from "@/lib/agent-registry";
import type { RegisteredAgent } from "@/types";

export const dynamic = "force-dynamic";

type SecurityMode = "strict" | "standard" | "permissive";

const SECURITY_CAPABILITY_TERMS = ["agent-shield", "iris", "policy", "security", "trust"];

function defaultSecurityMode(): SecurityMode {
  const raw = process.env.MEMROOS_SECURITY_MODE;
  return raw === "strict" || raw === "permissive" ? raw : "standard";
}

function modeFor(agent: RegisteredAgent, fallback: SecurityMode): SecurityMode {
  const raw = agent.metadata?.securityMode;
  return raw === "strict" || raw === "standard" || raw === "permissive" ? raw : fallback;
}

function securityCapabilities(agent: RegisteredAgent): string[] {
  return agent.capabilities
    .filter((capability) => {
      const haystack = `${capability.id} ${capability.name} ${capability.description} ${capability.tags.join(" ")}`.toLowerCase();
      return SECURITY_CAPABILITY_TERMS.some((term) => haystack.includes(term));
    })
    .map((capability) => capability.id);
}

function readinessScore(agent: RegisteredAgent, mode: SecurityMode, capabilities: string[]): number {
  let score = mode === "strict" ? 55 : mode === "standard" ? 40 : 25;
  if (agent.status === "active") score += 15;
  if (capabilities.length > 0) score += 20;
  if (agent.protocol === "a2a" || agent.protocol === "rest") score += 10;
  return Math.min(100, score);
}

export function GET() {
  const fallbackMode = defaultSecurityMode();
  const agents = listRegisteredAgents().map((agent) => {
    const mode = modeFor(agent, fallbackMode);
    const capabilities = securityCapabilities(agent);
    return {
      id: agent.id,
      name: agent.name,
      role: agent.role,
      protocol: agent.protocol,
      status: agent.status,
      securityMode: mode,
      securityCapabilities: capabilities,
      readinessScore: readinessScore(agent, mode, capabilities),
      lastHeartbeat: agent.lastHeartbeat,
    };
  });

  return Response.json({
    summary: {
      totalAgents: agents.length,
      strictAgents: agents.filter((agent) => agent.securityMode === "strict").length,
      standardAgents: agents.filter((agent) => agent.securityMode === "standard").length,
      permissiveAgents: agents.filter((agent) => agent.securityMode === "permissive").length,
      agentsWithSecurityCapabilities: agents.filter((agent) => agent.securityCapabilities.length > 0).length,
    },
    policies: {
      defaultMode: fallbackMode,
      dispatchPolicy: "enforced",
      a2aPolicy: "enforced",
      memoryWritePolicy: "enforced",
    },
    agents,
    timestamp: new Date().toISOString(),
  });
}
