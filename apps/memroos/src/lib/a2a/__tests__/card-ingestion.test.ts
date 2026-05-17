// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";
import fs from "fs";
import os from "os";
import path from "path";

const TEST_DB_DIR = path.join(os.tmpdir(), `a2a-card-ingestion-${crypto.randomUUID()}`);
const TEST_DB_PATH = path.join(TEST_DB_DIR, "ingestion.db");
const CARD_URL = "http://localhost:8001/a2a/check_prime_agent/.well-known/agent-card.json";

const ADK_CARD = {
  name: "ADK Check Prime Agent",
  description: "Checks whether numbers are prime",
  url: "http://localhost:8001/a2a/check_prime_agent",
  version: "1.0",
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: true,
  },
  defaultInputModes: ["text/plain", "application/json"],
  defaultOutputModes: ["text/plain", "application/json"],
  securitySchemes: {
    bearerAuth: { type: "http", scheme: "bearer" },
  },
  security: [{ bearerAuth: [] }],
  skills: [
    {
      id: "check_prime",
      name: "Check Prime",
      description: "Determine whether a supplied integer is prime.",
      tags: ["math", "adk"],
    },
  ],
  extensions: {
    adk: { agent: "check_prime_agent" },
  },
};

async function loadIngestion() {
  process.env.SQLITE_DB_PATH = TEST_DB_PATH;
  vi.resetModules();
  const ingestion = await import("../card-ingestion");
  const registry = await import("@/lib/agent-registry");
  const dbModule = await import("@/lib/db");
  return { ...ingestion, ...registry, closeDb: dbModule.closeDb };
}

function mockFetchCard(card = ADK_CARD) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify(card), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    )
  );
}

describe("A2A card ingestion", () => {
  beforeEach(() => {
    fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_DB_DIR, { recursive: true });
  });

  afterEach(async () => {
    const { closeDb } = await loadIngestion();
    closeDb();
    fs.rmSync(TEST_DB_DIR, { recursive: true, force: true });
    delete process.env.SQLITE_DB_PATH;
    vi.unstubAllGlobals();
  });

  it("validates an ADK-shaped bearer-secured A2A card", async () => {
    const { validateA2aAgentCard } = await loadIngestion();

    expect(validateA2aAgentCard(ADK_CARD)).toMatchObject({
      name: "ADK Check Prime Agent",
      url: "http://localhost:8001/a2a/check_prime_agent",
      version: "1.0",
      capabilities: { streaming: true },
      defaultInputModes: ["text/plain", "application/json"],
      defaultOutputModes: ["text/plain", "application/json"],
      securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } },
    });
  });

  it("rejects cards missing name, url, or skills", async () => {
    const { validateA2aAgentCard } = await loadIngestion();

    expect(() => validateA2aAgentCard({ ...ADK_CARD, name: undefined })).toThrow(/name/i);
    expect(() => validateA2aAgentCard({ ...ADK_CARD, url: undefined })).toThrow(/url/i);
    expect(() => validateA2aAgentCard({ ...ADK_CARD, skills: [] })).toThrow(/skill/i);
  });

  it("rejects unsafe agent-card URLs", async () => {
    const { isAllowedAgentCardUrl } = await loadIngestion();

    expect(isAllowedAgentCardUrl("file:///tmp/agent-card.json")).toBe(false);
    expect(isAllowedAgentCardUrl("ftp://example.test/agent-card.json")).toBe(false);
    expect(isAllowedAgentCardUrl("https://user:pass@example.test/agent-card.json")).toBe(false);
    expect(isAllowedAgentCardUrl("http://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isAllowedAgentCardUrl("http://metadata.google.internal/computeMetadata/v1")).toBe(false);
  });

  it("ingests through the canonical registry with ADK metadata and capabilities", async () => {
    mockFetchCard();
    const { ingestA2aAgentCard } = await loadIngestion();

    const result = await ingestA2aAgentCard({ cardUrl: CARD_URL, source: "adk" });

    expect(result.agent).toMatchObject({
      protocol: "a2a",
      platform: "gemini",
      name: "ADK Check Prime Agent",
    });
    expect(result.agent.capabilities).toEqual([
      expect.objectContaining({ id: "check_prime", tags: expect.arrayContaining(["a2a", "adk"]) }),
    ]);
  });

  it("stores allowlisted A2A metadata on the canonical registry record", async () => {
    mockFetchCard();
    const { ingestA2aAgentCard } = await loadIngestion();

    const { agent } = await ingestA2aAgentCard({ cardUrl: CARD_URL, source: "adk" });
    const metadata = agent.metadata.a2a as Record<string, unknown>;

    expect(Object.keys(metadata).sort()).toEqual([
      "cardHash",
      "cardUrl",
      "endpointUrl",
      "inputModes",
      "lastFetchedAt",
      "outputModes",
      "securitySchemes",
      "source",
      "validationStatus",
      "version",
    ]);
    expect(metadata).toMatchObject({
      cardUrl: CARD_URL,
      endpointUrl: ADK_CARD.url,
      version: "1.0",
      validationStatus: "validated",
      source: "adk",
    });
  });

  it("uses deterministic default id a2a_${sha256(cardUrl).slice(0, 12)}", async () => {
    mockFetchCard();
    const { ingestA2aAgentCard } = await loadIngestion();

    const { agent } = await ingestA2aAgentCard({ cardUrl: CARD_URL, source: "adk" });
    const expected = `a2a_${crypto.createHash("sha256").update(CARD_URL).digest("hex").slice(0, 12)}`;

    expect(agent.id).toBe(expected);
  });
});
