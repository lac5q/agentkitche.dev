// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  A2A_CANONICAL_AGENT_CARD_PATH,
  A2A_COMPAT_AGENT_CARD_PATH,
} from "../types";
import { getA2aConfig } from "../config";
import { buildKitchenAgentCard } from "../agent-card";

const A2A_ENV_KEYS = [
  "KITCHEN_A2A_PROFILE",
  "KITCHEN_PUBLIC_BASE_URL",
  "KITCHEN_A2A_ENDPOINT_BASE_URL",
  "KITCHEN_A2A_REMOTE_CARD_TIMEOUT_MS",
  "KITCHEN_A2A_ALLOW_PRIVATE_NETWORK_CARDS",
  "KITCHEN_A2A_ADK_FIXTURE_CARD_URL",
] as const;

afterEach(() => {
  for (const key of A2A_ENV_KEYS) {
    delete process.env[key];
  }
  vi.resetModules();
});

describe("getA2aConfig", () => {
  it("defaults to local-dev profile", () => {
    expect(getA2aConfig()).toEqual({
      profile: "local-dev",
      publicBaseUrl: "http://localhost:3000",
      endpointBaseUrl: "http://localhost:3000",
      canonicalCardPath: "/.well-known/agent-card.json",
      compatCardPath: "/.well-known/agent.json",
      remoteCardTimeoutMs: 5000,
      allowPrivateNetworkCards: true,
      adkFixtureCardUrl:
        "http://localhost:8001/a2a/check_prime_agent/.well-known/agent-card.json",
    });
  });

  it("honors A2A environment overrides and normalizes URLs", () => {
    process.env.KITCHEN_A2A_PROFILE = "private-network";
    process.env.KITCHEN_PUBLIC_BASE_URL = "https://kitchen.example.test/";
    process.env.KITCHEN_A2A_ENDPOINT_BASE_URL = "https://a2a.example.test/";
    process.env.KITCHEN_A2A_REMOTE_CARD_TIMEOUT_MS = "1250";
    process.env.KITCHEN_A2A_ALLOW_PRIVATE_NETWORK_CARDS = "false";
    process.env.KITCHEN_A2A_ADK_FIXTURE_CARD_URL =
      "https://adk.example.test/.well-known/agent-card.json";

    expect(getA2aConfig()).toMatchObject({
      profile: "private-network",
      publicBaseUrl: "https://kitchen.example.test",
      endpointBaseUrl: "https://a2a.example.test",
      remoteCardTimeoutMs: 1250,
      allowPrivateNetworkCards: false,
      adkFixtureCardUrl: "https://adk.example.test/.well-known/agent-card.json",
    });
  });
});

describe("buildKitchenAgentCard", () => {
  it("builds a spec-shaped Kitchen card with canonical card paths", () => {
    const card = buildKitchenAgentCard({
      ...getA2aConfig(),
      endpointBaseUrl: "https://kitchen.example.test/a2a",
    });

    expect(card.url).toBe("https://kitchen.example.test/a2a");
    expect(card.url.startsWith("https://kitchen.example.test/a2a")).toBe(true);
    expect(card.extensions.kitchen.cardPaths.canonical).toBe(A2A_CANONICAL_AGENT_CARD_PATH);
    expect(card.extensions.kitchen.cardPaths.compatibility).toBe(A2A_COMPAT_AGENT_CARD_PATH);
  });

  it("does not leak secrets in the public card", () => {
    const json = JSON.stringify(buildKitchenAgentCard());

    expect(json).toContain("bearerAuth");
    expect(json).not.toContain("authentication: none");
    expect(json).not.toContain("apiKey");
    expect(json).not.toContain("token");
    expect(json).not.toContain("secret");
    expect(json).not.toContain("AGENT_CONFIGS_PATH");
    expect(json).not.toContain("KNOWLEDGE_BASE_PATH");
  });

  it("advertises streaming, task history, and Kitchen A2A skills", () => {
    const card = buildKitchenAgentCard();

    expect(card.capabilities.streaming).toBe(true);
    expect(card.capabilities.stateTransitionHistory).toBe(true);
    expect(card.skills.map((skill) => skill.id)).toEqual(
      expect.arrayContaining(["agent_registry", "task_delegation", "memory_reporting"])
    );
  });
});

describe("well-known A2A agent card routes", () => {
  it("returns the canonical Kitchen card", async () => {
    const { GET } = await import("../../../app/.well-known/agent-card.json/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.name).toBe("agentkitchen.dev");
    expect(body.extensions.kitchen.cardPaths.canonical).toBe(A2A_CANONICAL_AGENT_CARD_PATH);
    expect(body.extensions.kitchen.compatibilityAlias).toBeUndefined();
  });

  it("returns a compatibility alias card at the legacy roadmap path", async () => {
    const { GET } = await import("../../../app/.well-known/agent.json/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.name).toBe("agentkitchen.dev");
    expect(body.extensions.kitchen.cardPaths.compatibility).toBe(A2A_COMPAT_AGENT_CARD_PATH);
    expect(body.extensions.kitchen.compatibilityAlias).toBe(true);
  });
});
