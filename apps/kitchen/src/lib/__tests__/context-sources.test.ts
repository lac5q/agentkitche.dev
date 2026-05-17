// @vitest-environment node
import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";

import {
  evaluateContextSources,
  loadContextSourceContracts,
  requireFreshContextSources,
  type ContextSourcesConfig,
} from "../context-sources";

function config(): ContextSourcesConfig {
  return {
    sources: [
      {
        id: "spark",
        type: "spark",
        enabled: true,
        requiredTools: ["python3"],
        envVars: [],
        sourcePath: "./spark",
        ingestCommand: "spark ingest",
        indexCommand: "qmd index spark",
        freshnessThresholdMinutes: 60,
        qmdCollection: "spark",
        safeAnswerPolicy: "source_required",
      },
      {
        id: "gmail",
        type: "gmail",
        enabled: false,
        requiredTools: [],
        envVars: [],
        sourcePath: "./gmail",
        ingestCommand: null,
        indexCommand: null,
        freshnessThresholdMinutes: 60,
        qmdCollection: "gmail",
        safeAnswerPolicy: "source_required",
      },
    ],
  };
}

describe("context source contracts", () => {
  it("reports ok, stale, missing, degraded, and disabled states", () => {
    const now = new Date("2026-05-17T12:00:00Z");
    const health = evaluateContextSources(config(), {
      now,
      exists: (target) => target.endsWith("spark"),
      stat: () => ({ mtime: new Date("2026-05-17T11:30:00Z") }) as never,
      countDocs: () => 3,
      hasTool: () => true,
    });

    expect(health.sources[0]).toMatchObject({ id: "spark", status: "ok", documentCount: 3, ageMinutes: 30 });
    expect(health.sources[1]).toMatchObject({ id: "gmail", status: "disabled" });
  });

  it("marks enabled missing paths as SOURCE_MISSING for safe-answer gates", () => {
    const now = new Date("2026-05-17T12:00:00Z");
    const health = evaluateContextSources(config(), {
      now,
      exists: () => false,
      hasTool: () => true,
    });

    expect(health.sources[0]).toMatchObject({ id: "spark", status: "missing" });
    expect(requireFreshContextSources(health, ["spark"])).toMatchObject({
      ok: false,
      code: "SOURCE_MISSING",
      sourceId: "spark",
    });
  });

  it("marks stale sources as SOURCE_STALE for source-backed tasks", () => {
    const now = new Date("2026-05-17T12:00:00Z");
    const health = evaluateContextSources(config(), {
      now,
      exists: () => true,
      stat: () => ({ mtime: new Date("2026-05-17T08:00:00Z") }) as never,
      countDocs: () => 10,
      hasTool: () => true,
    });

    expect(health.sources[0]).toMatchObject({ id: "spark", status: "stale" });
    expect(requireFreshContextSources(health, ["spark"])).toMatchObject({
      ok: false,
      code: "SOURCE_STALE",
      sourceId: "spark",
    });
  });

  it("loads contracts from CONTEXT_SOURCES_CONFIG when configured", () => {
    const previous = process.env.CONTEXT_SOURCES_CONFIG;
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "memroos-context-sources-"));
    const target = path.join(dir, "context-sources.json");
    fs.writeFileSync(target, JSON.stringify({ sources: [{ ...config().sources[0], id: "custom-qmd" }] }));
    process.env.CONTEXT_SOURCES_CONFIG = target;

    try {
      expect(loadContextSourceContracts().sources[0].id).toBe("custom-qmd");
    } finally {
      if (previous == null) delete process.env.CONTEXT_SOURCES_CONFIG;
      else process.env.CONTEXT_SOURCES_CONFIG = previous;
      fs.rmSync(dir, { force: true, recursive: true });
    }
  });
});
