import type { A2aAgentCard, A2aAgentSkill } from "./types";
import { getA2aConfig, type A2aConfig } from "./config";
import { A2A_VERSION } from "./types";

const KITCHEN_A2A_SKILLS: A2aAgentSkill[] = [
  {
    id: "agent_registry",
    name: "Agent Registry",
    description: "Register, validate, and track A2A-compatible agents in MemroOS.",
    tags: ["registry", "discovery", "a2a"],
    inputModes: ["application/json"],
    outputModes: ["application/json"],
  },
  {
    id: "task_delegation",
    name: "Task Delegation",
    description: "Create durable A2A tasks and delegate them to registered remote agents.",
    tags: ["tasks", "delegation", "broker"],
    inputModes: ["text/plain", "application/json"],
    outputModes: ["text/plain", "application/json"],
  },
  {
    id: "memory_reporting",
    name: "Memory Reporting",
    description: "Accept authenticated memory and outcome reports from connected agents.",
    tags: ["memory", "reporting", "observability"],
    inputModes: ["application/json"],
    outputModes: ["application/json"],
  },
];

export function buildKitchenAgentCard(config: A2aConfig = getA2aConfig()): A2aAgentCard {
  return {
    name: "MemroOS",
    description: "Agent memory OS and A2A-native durable task broker",
    version: A2A_VERSION,
    url: config.endpointBaseUrl,
    preferredTransport: "HTTP+JSON",
    capabilities: {
      streaming: true,
      pushNotifications: false,
      stateTransitionHistory: true,
    },
    defaultInputModes: ["text/plain", "application/json"],
    defaultOutputModes: ["text/plain", "application/json"],
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "MemroOS registry credential",
        description: "Use the bearer credential issued by the MemroOS agent registry.",
      },
    },
    security: [{ bearerAuth: [] }],
    skills: KITCHEN_A2A_SKILLS,
    extensions: {
      kitchen: {
        profile: config.profile,
        cardPaths: {
          canonical: config.canonicalCardPath,
          compatibility: config.compatCardPath,
        },
      },
    },
  };
}
