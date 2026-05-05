import type { RegisteredAgent } from "@/types";
import { A2aError } from "./errors";
import {
  cancelA2aTask,
  getA2aTaskForAgent,
  listA2aTasks,
  sendA2aMessage,
} from "./task-service";

export const A2A_HTTP_JSON_ROUTES = [
  "/message:send",
  "/message:stream",
  "/tasks",
  "/tasks/{id}",
  "/tasks/{id}:cancel",
  "/tasks/{id}:subscribe",
] as const;

export const A2A_JSON_RPC_METHODS = [
  "message/send",
  "tasks/get",
  "tasks/list",
  "tasks/cancel",
] as const;

const STREAMING_METHOD_MESSAGE = "Streaming methods use /message:stream or /tasks/{id}:subscribe";
const STREAMING_METHODS = new Set(["message/stream", "tasks/subscribe"]);

type JsonRpcId = string | number | null;

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: {
    code: number;
    message: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseJsonRpc(body: unknown): JsonRpcRequest {
  if (!isRecord(body) || body.jsonrpc !== "2.0" || typeof body.method !== "string") {
    throw new A2aError("INVALID_REQUEST", "Invalid JSON-RPC 2.0 request");
  }

  return {
    jsonrpc: "2.0",
    id: typeof body.id === "string" || typeof body.id === "number" || body.id === null ? body.id : null,
    method: body.method,
    params: isRecord(body.params) ? body.params : {},
  };
}

function ok(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

function error(id: JsonRpcId, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function taskIdFromParams(params: Record<string, unknown>): string {
  const id = params.id ?? params.taskId;
  if (typeof id !== "string" || !id.trim()) {
    throw new A2aError("INVALID_REQUEST", "task id is required");
  }
  return id;
}

export async function dispatchA2aJsonRpc(
  authenticatedAgent: RegisteredAgent | null,
  body: unknown
): Promise<JsonRpcResponse> {
  const request = parseJsonRpc(body);

  if (STREAMING_METHODS.has(request.method)) {
    return error(request.id ?? null, -32000, STREAMING_METHOD_MESSAGE);
  }

  try {
    switch (request.method) {
      case "message/send":
        return ok(request.id ?? null, await sendA2aMessage(authenticatedAgent, request.params ?? {}));
      case "tasks/get":
        return ok(
          request.id ?? null,
          await getA2aTaskForAgent(authenticatedAgent, taskIdFromParams(request.params ?? {}))
        );
      case "tasks/list":
        return ok(request.id ?? null, await listA2aTasks(authenticatedAgent));
      case "tasks/cancel":
        return ok(
          request.id ?? null,
          await cancelA2aTask(authenticatedAgent, taskIdFromParams(request.params ?? {}))
        );
      default:
        return error(request.id ?? null, -32601, `Unsupported A2A method: ${request.method}`);
    }
  } catch (caught) {
    if (caught instanceof A2aError) {
      throw caught;
    }
    throw new A2aError("INTERNAL", "A2A JSON-RPC dispatch failed");
  }
}
