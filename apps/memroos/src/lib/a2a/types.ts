export const A2A_VERSION = "1.0";
export const A2A_CANONICAL_AGENT_CARD_PATH = "/.well-known/agent-card.json";
export const A2A_COMPAT_AGENT_CARD_PATH = "/.well-known/agent.json";

export const A2A_TASK_STATES = [
  "submitted",
  "working",
  "input-required",
  "completed",
  "failed",
  "canceled",
] as const;

export type A2aTaskState = (typeof A2A_TASK_STATES)[number];

export interface A2aAgentSkill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
}

export type A2aSecurityScheme =
  | {
      type: "http";
      scheme: "bearer";
      bearerFormat?: string;
      description?: string;
    }
  | {
      type: "apiKey";
      in: "header" | "query" | "cookie";
      name: string;
      description?: string;
    }
  | {
      type: "oauth2" | "openIdConnect";
      description?: string;
      [key: string]: unknown;
    };

export interface A2aAgentCard {
  name: string;
  description: string;
  version: string;
  url: string;
  preferredTransport: "HTTP+JSON" | "JSON-RPC";
  capabilities: {
    streaming: boolean;
    pushNotifications: boolean;
    stateTransitionHistory: boolean;
  };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  securitySchemes: Record<string, A2aSecurityScheme>;
  security: Array<Record<string, string[]>>;
  skills: A2aAgentSkill[];
  extensions: {
    memroos: {
      profile: string;
      cardPaths: {
        canonical: string;
        compatibility: string;
      };
      compatibilityAlias?: boolean;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

export interface A2aMessagePart {
  kind: "text" | "data" | "file";
  text?: string;
  data?: unknown;
  file?: {
    name?: string;
    mimeType?: string;
    uri?: string;
    bytes?: string;
  };
}

export interface A2aMessage {
  messageId: string;
  role: "user" | "agent";
  parts: A2aMessagePart[];
  contextId?: string;
  taskId?: string;
  metadata?: Record<string, unknown>;
}

export interface A2aTask {
  id: string;
  contextId?: string;
  status: {
    state: A2aTaskState;
    message?: A2aMessage;
    timestamp?: string;
  };
  history?: A2aMessage[];
  artifacts?: Array<{
    artifactId: string;
    name?: string;
    description?: string;
    parts: A2aMessagePart[];
    metadata?: Record<string, unknown>;
  }>;
  metadata?: Record<string, unknown>;
}

export interface A2aTaskEvent {
  taskId: string;
  contextId?: string;
  kind: "task" | "status-update" | "artifact-update" | "message";
  sequence?: number;
  final?: boolean;
  task?: A2aTask;
  message?: A2aMessage;
  artifact?: A2aTask["artifacts"] extends Array<infer T> ? T : never;
  metadata?: Record<string, unknown>;
}
