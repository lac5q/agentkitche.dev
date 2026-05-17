// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("child_process", () => ({
  execFileSync: vi.fn(),
}));

vi.mock("fs/promises", () => ({
  stat: vi.fn(async () => ({})),
}));

async function loadRoute() {
  vi.resetModules();
  return import("../route");
}

describe("runtime health route", () => {
  beforeEach(() => {
    process.env.MEM0_URL = "http://mem0.test";
  });

  afterEach(() => {
    delete process.env.MEM0_URL;
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("marks mem0 degraded when the health payload reports queued writes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          status: "degraded",
          vector_store: "connected",
          queue: { queued: 3 },
        })
      )
    );
    const { GET } = await loadRoute();

    const response = await GET();
    const body = await response.json();
    const mem0 = body.services.find((service: { service: string }) => service.service === "mem0");

    expect(mem0.status).toBe("degraded");
    expect(mem0.detail).toContain("3 queued memory saves");
  });

  it("marks mem0 degraded when Qdrant is not connected through mem0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          status: "ok",
          vector_store: "unavailable",
          queue: { queued: 0 },
        })
      )
    );
    const { GET } = await loadRoute();

    const response = await GET();
    const body = await response.json();
    const mem0 = body.services.find((service: { service: string }) => service.service === "mem0");

    expect(mem0.status).toBe("degraded");
    expect(mem0.detail).toContain("vector store unavailable");
  });
});
