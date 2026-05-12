import type { NextRequest } from "next/server";
import { getRemoteAgents, listRegisteredAgents } from "@/lib/agent-registry";
import { selectAdapter } from "@/lib/dispatch/adapter-factory";
import type { AgentPlatform, RegisteredAgent, RemoteAgentConfig } from "@/types";

export const dynamic = "force-dynamic";

type CheckStatus = "ready" | "blocked" | "warning";

interface AgentEngagementCheck {
  agentId: string;
  name: string;
  status: RegisteredAgent["status"];
  chat: {
    status: CheckStatus;
    runner: "anthropic" | "opencode";
    detail: string;
  };
  dispatch: {
    status: CheckStatus;
    adapter: string;
    detail: string;
  };
  voice: {
    status: CheckStatus;
    detail: string;
  };
}

const OPENCODE_PLATFORMS = new Set<AgentPlatform>(["qwen", "gemini", "opencode"]);

function toDispatchConfig(agent: RegisteredAgent, remote?: RemoteAgentConfig): RemoteAgentConfig {
  if (remote) return remote;

  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    platform: agent.platform,
    protocol: agent.protocol,
    location: agent.location ?? "local",
    host: agent.host ?? "localhost",
    port: agent.port ?? 0,
    healthEndpoint: agent.healthEndpoint ?? "/health",
    tunnelUrl: agent.tunnelUrl ?? undefined,
    metadata: agent.metadata,
    skills: agent.capabilities.map((capability) => ({
      id: capability.id,
      name: capability.name,
      description: capability.description,
      tags: capability.tags,
      inputModes: ["text"],
      outputModes: ["text"],
    })),
  };
}

function chatCheck(agent: RegisteredAgent): AgentEngagementCheck["chat"] {
  const usesOpenCode =
    OPENCODE_PLATFORMS.has(agent.platform) ||
    /qwen|gemini|opencode/i.test(`${agent.role} ${agent.name}`);

  if (usesOpenCode) {
    const enabled = process.env.KITCHEN_ENABLE_OPENCODE === "true";
    return {
      status: enabled ? "ready" : "blocked",
      runner: "opencode",
      detail: enabled
        ? "OpenCode runner is enabled for this agent."
        : "OpenCode runner is disabled. Set KITCHEN_ENABLE_OPENCODE=true for live chat.",
    };
  }

  const configured = Boolean(process.env.ANTHROPIC_API_KEY);
  return {
    status: configured ? "ready" : "blocked",
    runner: "anthropic",
    detail: configured
      ? "Anthropic chat is configured. Provider quota can still reject a live response."
      : "ANTHROPIC_API_KEY is missing.",
  };
}

function voiceCheck(): AgentEngagementCheck["voice"] {
  const configured = Boolean(process.env.ELEVENLABS_API_KEY);
  return {
    status: configured ? "ready" : "warning",
    detail: configured
      ? "TTS key is configured. Browser speech recognition is checked in the UI."
      : "ELEVENLABS_API_KEY is missing, so spoken replies will be muted.",
  };
}

function dispatchCheck(agent: RegisteredAgent, remote?: RemoteAgentConfig): AgentEngagementCheck["dispatch"] {
  const dispatchAgent = toDispatchConfig(agent, remote);
  const adapter = selectAdapter(dispatchAgent);
  const hasPush = adapter.name === "openclaw" || adapter.name === "a2a";
  const remoteDetail = remote
    ? "Remote transport is registered."
    : "Local agent will receive a queued hive delegation.";

  return {
    status: hasPush || !remote ? "ready" : "warning",
    adapter: adapter.name,
    detail: `${remoteDetail} Delivery mode: ${hasPush ? "push/queue file" : "poll queue"}.`,
  };
}

export async function POST(req: NextRequest | Request) {
  const body = (await req.json().catch(() => ({}))) as { agentIds?: string[] };
  const requested = new Set((body.agentIds ?? []).filter(Boolean));
  const remotes = new Map(getRemoteAgents().map((agent) => [agent.id, agent]));
  const agents = listRegisteredAgents().filter((agent) => requested.size === 0 || requested.has(agent.id));

  return Response.json({
    ok: true,
    results: agents.map((agent): AgentEngagementCheck => ({
      agentId: agent.id,
      name: agent.name,
      status: agent.status,
      chat: chatCheck(agent),
      dispatch: dispatchCheck(agent, remotes.get(agent.id)),
      voice: voiceCheck(),
    })),
    timestamp: new Date().toISOString(),
  });
}
