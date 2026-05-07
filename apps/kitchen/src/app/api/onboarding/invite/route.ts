import { createAgentOnboardingToken, shellQuote } from "@/lib/agent-onboarding";
import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";
import type { AgentPlatform, AgentProtocol, RegisteredAgentCapability } from "@/types";

export const dynamic = "force-dynamic";

const PLATFORMS = new Set(["claude", "codex", "qwen", "gemini", "opencode", "hermes", "openclaw", "chatgpt"]);
const PROTOCOLS = new Set(["rest", "a2a", "ui", "local"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function originFromRequest(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

function parseCapabilities(value: unknown): RegisteredAgentCapability[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .filter(isRecord)
    .map((capability) => ({
      id: String(capability.id ?? ""),
      name: String(capability.name ?? capability.id ?? ""),
      description: String(capability.description ?? ""),
      tags: Array.isArray(capability.tags) ? capability.tags.map(String) : [],
    }))
    .filter((capability) => capability.id && capability.name);
}

export async function POST(request: Request) {
  if (!authorizeRegistryWrite(request)) {
    return registryWriteUnauthorizedResponse();
  }

  const body = (await request.json().catch(() => ({}))) as unknown;
  const input = isRecord(body) ? body : {};
  const kitchenUrl = typeof input.kitchenUrl === "string" ? input.kitchenUrl : originFromRequest(request);
  const ttlMinutes = typeof input.ttlMinutes === "number" ? input.ttlMinutes : 15;
  const agentId = typeof input.agentId === "string" ? input.agentId : undefined;
  const defaultPlatform =
    typeof input.platform === "string" && PLATFORMS.has(input.platform)
      ? (input.platform as AgentPlatform)
      : undefined;
  const defaultProtocol =
    typeof input.protocol === "string" && PROTOCOLS.has(input.protocol)
      ? (input.protocol as AgentProtocol)
      : "rest";

  const { token, payload } = createAgentOnboardingToken({
    kitchenUrl,
    mcpUrl: typeof input.mcpUrl === "string" ? input.mcpUrl : undefined,
    ttlSeconds: Math.max(1, ttlMinutes) * 60,
    allowedAgentIds: agentId ? [agentId] : undefined,
    defaultPlatform,
    defaultProtocol,
    capabilities: parseCapabilities(input.capabilities),
  });

  const flags = [
    agentId ? `--id ${shellQuote(agentId)}` : "--id <agent-id>",
    typeof input.name === "string" ? `--name ${shellQuote(input.name)}` : "--name <agent-name>",
    typeof input.role === "string" ? `--role ${shellQuote(input.role)}` : "--role <agent-role>",
    defaultPlatform ? `--platform ${shellQuote(defaultPlatform)}` : "--platform <platform>",
    `--mcp-target ${shellQuote(typeof input.mcpTarget === "string" ? input.mcpTarget : "auto")}`,
  ];
  const command = `curl -fsSL ${shellQuote(`${payload.kitchenUrl}/api/onboarding/script?token=${encodeURIComponent(token)}`)} | bash -s -- ${flags.join(" ")}`;

  return Response.json({
    ok: true,
    token,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    command,
    mcpUrl: payload.mcpUrl,
    timestamp: new Date().toISOString(),
  });
}
