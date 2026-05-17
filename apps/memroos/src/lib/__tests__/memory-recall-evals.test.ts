// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  hasRequiredRecallTiming,
  scoreMemoryRecallCase,
  summarizeMemoryEvalRun,
  type MemoryRecallEvalCase,
  type MemoryRecallTraceEvent,
  type NormalizedRecallResult,
} from "../memory-recall-evals";

const baseCase: MemoryRecallEvalCase = {
  id: "marketing-strategy-gold",
  layer: "gold",
  scenario: "Agent needs prior marketing strategy before recommendation",
  agentId: "codex",
  taskPrompt: "Recommend the next paid media move.",
  expectedFacts: ["MER below target", "do not scale spend"],
  expectedMemoryIds: ["mem-1", "mem-2"],
  expectedTiers: ["vector", "episodic"],
  requiredTiming: "before_plan",
  thresholds: {
    recallAtK: 0.85,
    precisionAtK: 0.7,
    mrr: 0.75,
    latencyMs: 2000,
  },
};

describe("memory recall eval scoring", () => {
  it("scores recall, precision, mrr, tier coverage, and false positives", () => {
    const results: NormalizedRecallResult[] = [
      { id: "noise", tier: "vector", content: "unrelated result", latencyMs: 25 },
      { id: "mem-2", tier: "episodic", content: "Decision: do not scale spend yet", latencyMs: 25 },
      { id: "mem-1", tier: "vector", content: "April plan noted MER below target", latencyMs: 25 },
    ];

    const trace: MemoryRecallTraceEvent[] = [{ action: "memory_recall", timing: "before_plan", timestamp: "2026-05-15T00:00:00.000Z" }];
    const score = scoreMemoryRecallCase(baseCase, results, trace, 5);

    expect(score.metrics.recallAtK).toBe(1);
    expect(score.metrics.precisionAtK).toBeCloseTo(2 / 3, 3);
    expect(score.metrics.mrr).toBe(0.5);
    expect(score.metrics.tierCoverage).toBe(1);
    expect(score.metrics.falsePositiveRate).toBeCloseTo(1 / 3, 3);
    expect(score.passed).toBe(false);
    expect(score.failures).toContain("mrr below threshold");
  });

  it("accepts matching expected facts when stable ids are absent", () => {
    const results: NormalizedRecallResult[] = [
      { id: "generated-1", tier: "vector", content: "Prior note: MER below target, do not scale spend.", latencyMs: 100 },
    ];
    const trace: MemoryRecallTraceEvent[] = [{ action: "memory_recall", timing: "before_plan", timestamp: "2026-05-15T00:00:00.000Z" }];
    const score = scoreMemoryRecallCase({ ...baseCase, expectedMemoryIds: [] }, results, trace, 5);

    expect(score.metrics.recallAtK).toBe(1);
    expect(score.metrics.mrr).toBe(1);
    expect(score.failures).not.toContain("no expected memory found in top k");
  });

  it("fails right-time scenarios when recall happens too late", () => {
    const trace: MemoryRecallTraceEvent[] = [{ action: "memory_recall", timing: "before_final", timestamp: "2026-05-15T00:00:00.000Z" }];

    expect(hasRequiredRecallTiming(trace, "before_plan")).toBe(false);
    expect(hasRequiredRecallTiming(trace, "before_final")).toBe(true);
  });

  it("summarizes pass rate and p95 latency", () => {
    const summary = summarizeMemoryEvalRun([
      { passed: true, metrics: { latencyMs: 100 } },
      { passed: false, metrics: { latencyMs: 5000 } },
      { passed: true, metrics: { latencyMs: 1500 } },
    ]);

    expect(summary.totalCases).toBe(3);
    expect(summary.passedCases).toBe(2);
    expect(summary.passRate).toBeCloseTo(2 / 3, 3);
    expect(summary.p95LatencyMs).toBe(5000);
  });
});
