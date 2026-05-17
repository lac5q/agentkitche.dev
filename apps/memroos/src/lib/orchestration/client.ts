import type { RegisteredAgent } from "@/types";

export interface OrchestrationAgent {
  id: string;
  name: string;
  role: string;
  status: string;
  protocol: string;
  platform: string;
  capabilities: RegisteredAgent["capabilities"];
  metadata: RegisteredAgent["metadata"];
}

export interface OrchestrationTaskInput {
  taskSummary: string;
  requiredCapability?: string;
  correlationId?: string;
  requiresApproval?: boolean;
  agents: OrchestrationAgent[];
}

export interface OrchestrationRouteResult {
  ok: boolean;
  runId: string;
  correlationId: string;
  status: string;
  selectedAgentId: string | null;
  hilDecisionId?: string | null;
  retryLimit?: number;
  boundary?: string;
}

export interface OrchestrationHilDecision {
  id: string;
  runId: string;
  taskSummary: string;
  selectedAgentId: string | null;
  correlationId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  resolvedAt?: string | null;
}

function serviceUrl(): string {
  return (process.env.ORCHESTRATION_SERVICE_URL || "http://localhost:3210").replace(/\/$/, "");
}

async function parseServiceResponse<T>(response: Response, fallbackError: string): Promise<T> {
  const body = (await response.json().catch(() => null)) as T | { detail?: string; error?: string } | null;
  if (!response.ok) {
    const error = body && typeof body === "object" && "detail" in body
      ? body.detail
      : body && typeof body === "object" && "error" in body
        ? body.error
        : fallbackError;
    throw new Error(String(error || fallbackError));
  }
  return body as T;
}

export function registeredAgentToOrchestrationAgent(agent: RegisteredAgent): OrchestrationAgent {
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    status: agent.status,
    protocol: agent.protocol,
    platform: agent.platform,
    capabilities: agent.capabilities,
    metadata: agent.metadata,
  };
}

export async function postOrchestrationTask(input: OrchestrationTaskInput): Promise<OrchestrationRouteResult> {
  const response = await fetch(`${serviceUrl()}/tasks/route`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseServiceResponse<OrchestrationRouteResult>(response, "Orchestration service unavailable");
}

export async function listOrchestrationHil(): Promise<{ ok: boolean; decisions: OrchestrationHilDecision[] }> {
  const response = await fetch(`${serviceUrl()}/hil`);
  return parseServiceResponse<{ ok: boolean; decisions: OrchestrationHilDecision[] }>(
    response,
    "Orchestration HIL service unavailable"
  );
}

export async function resolveOrchestrationHil(
  id: string,
  decision: "approve" | "reject"
): Promise<OrchestrationHilDecision & { ok: boolean; resumed?: boolean }> {
  const response = await fetch(`${serviceUrl()}/hil/${encodeURIComponent(id)}/resolve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision }),
  });
  return parseServiceResponse<OrchestrationHilDecision & { ok: boolean; resumed?: boolean }>(
    response,
    "Orchestration HIL service unavailable"
  );
}
