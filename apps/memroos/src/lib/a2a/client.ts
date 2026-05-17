import type { DispatchResult, DispatchTask } from "@/lib/dispatch/types";
import type { RegisteredAgent, RemoteAgentConfig } from "@/types";
import { getA2aConfig } from "./config";
import type { A2aMessage, A2aTask } from "./types";

const MAX_REMOTE_BODY_CHARS = 512;

type A2aOutboundAgent = Pick<RemoteAgentConfig, "id" | "host" | "port" | "tunnelUrl" | "metadata"> |
  Pick<RegisteredAgent, "id" | "host" | "port" | "tunnelUrl" | "metadata">;

interface RequestOptions {
  timeoutMs?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function a2aMetadata(agent: A2aOutboundAgent): Record<string, unknown> {
  const value = agent.metadata?.a2a;
  return isRecord(value) ? value : {};
}

function stringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function truncateRemoteBody(raw: string): string {
  return raw.length > MAX_REMOTE_BODY_CHARS ? raw.slice(0, MAX_REMOTE_BODY_CHARS) : raw;
}

function normalizeUrl(rawUrl: string): string {
  const url = new URL(rawUrl);
  url.username = "";
  url.password = "";
  return url.toString().replace(/\/$/, "");
}

function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function endpointUrl(agent: A2aOutboundAgent): string {
  const metadata = a2aMetadata(agent);
  const endpoint = stringField(metadata, "endpointUrl");
  if (endpoint) return normalizeUrl(endpoint);
  if (agent.tunnelUrl) return normalizeUrl(agent.tunnelUrl);
  if (agent.host && agent.port) return normalizeUrl(`http://${agent.host}:${agent.port}`);
  throw new Error(`A2A endpoint is not configured for agent ${agent.id}`);
}

function messageSendUrl(agent: A2aOutboundAgent): string {
  const override = stringField(a2aMetadata(agent), "messageSendUrl");
  return override ? normalizeUrl(override) : joinUrl(endpointUrl(agent), "/message:send");
}

function taskUrl(agent: A2aOutboundAgent, taskId: string): string {
  return joinUrl(endpointUrl(agent), `/tasks/${encodeURIComponent(taskId)}`);
}

function authorizationHeader(agent: A2aOutboundAgent): string | null {
  const outboundAuth = a2aMetadata(agent).outboundAuth;
  const envKey = isRecord(outboundAuth) ? stringField(outboundAuth, "envKey") : null;
  if (!envKey) return null;
  const secret = process.env[envKey];
  return secret ? `Bearer ${secret}` : null;
}

function outboundHeaders(agent: A2aOutboundAgent): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/json",
    "content-type": "application/json",
  };
  const authorization = authorizationHeader(agent);
  if (authorization) headers.authorization = authorization;
  return headers;
}

function outboundMessage(task: DispatchTask): A2aMessage {
  return {
    messageId: `${task.task_id}-message`,
    role: "user",
    parts: [{ kind: "text", text: task.task_summary }],
    contextId: task.context_id,
    taskId: task.task_id,
    metadata: {
      priority: task.priority,
      dispatchedAt: task.dispatched_at,
      fromAgent: task.from_agent,
      input: task.input ?? {},
    },
  };
}

function outboundPayload(task: DispatchTask): Record<string, unknown> {
  return {
    task_id: task.task_id,
    context_id: task.context_id,
    message: outboundMessage(task),
    metadata: {
      ...(task.input ?? {}),
      memroosDelegated: true,
      fromAgent: task.from_agent,
      toAgent: task.to_agent,
    },
  };
}

function timeoutSignal(options?: RequestOptions): AbortSignal {
  return AbortSignal.timeout(options?.timeoutMs ?? getA2aConfig().remoteCardTimeoutMs);
}

async function parseRemoteResponse(response: Response): Promise<{ text: string; json: unknown }> {
  const text = await response.text();
  if (!text) return { text, json: null };
  try {
    return { text, json: JSON.parse(text) as unknown };
  } catch {
    return { text, json: null };
  }
}

function remoteTaskFrom(value: unknown): A2aTask | null {
  if (!isRecord(value)) return null;
  if (isRecord(value.task)) return value.task as unknown as A2aTask;
  if (isRecord(value.status) || typeof value.id === "string") return value as unknown as A2aTask;
  return null;
}

async function requestRemoteTask(
  agent: A2aOutboundAgent,
  url: string,
  init: Omit<RequestInit, "headers" | "signal">,
  options?: RequestOptions
): Promise<DispatchResult> {
  try {
    const response = await fetch(url, {
      ...init,
      headers: outboundHeaders(agent),
      signal: timeoutSignal(options),
    });
    const parsed = await parseRemoteResponse(response);
    if (!response.ok) {
      return {
        accepted: false,
        mode: "rejected",
        detail: `Remote A2A agent returned ${response.status}`,
        evidence: { status: response.status, body: truncateRemoteBody(parsed.text) },
      };
    }

    const remoteTask = remoteTaskFrom(parsed.json);
    return {
      accepted: true,
      mode: "pushed",
      detail: "Remote A2A agent accepted the task",
      evidence: {
        endpoint: redactUrlForDisplay(url),
        remoteTask,
        remoteTaskId: remoteTask?.id,
        state: remoteTask?.status?.state,
      },
    };
  } catch (error) {
    return {
      accepted: false,
      mode: "rejected",
      detail: `Remote A2A request failed: ${error instanceof Error ? error.message : "unknown error"}`,
      evidence: { endpoint: redactUrlForDisplay(url) },
    };
  }
}

export function redactUrlForDisplay(rawUrl: string): string {
  try {
    return normalizeUrl(rawUrl);
  } catch {
    return rawUrl.replace(/\/\/[^/@\s]+@/, "//");
  }
}

export async function sendMessageToA2aAgent(
  agent: A2aOutboundAgent,
  task: DispatchTask,
  options?: RequestOptions
): Promise<DispatchResult> {
  return requestRemoteTask(
    agent,
    messageSendUrl(agent),
    { method: "POST", body: JSON.stringify(outboundPayload(task)) },
    options
  );
}

export async function getRemoteA2aTask(
  agent: A2aOutboundAgent,
  taskId: string,
  options?: RequestOptions
): Promise<DispatchResult> {
  return requestRemoteTask(agent, taskUrl(agent, taskId), { method: "GET" }, options);
}

export async function cancelRemoteA2aTask(
  agent: A2aOutboundAgent,
  taskId: string,
  options?: RequestOptions
): Promise<DispatchResult> {
  return requestRemoteTask(agent, `${taskUrl(agent, taskId)}:cancel`, { method: "POST" }, options);
}
