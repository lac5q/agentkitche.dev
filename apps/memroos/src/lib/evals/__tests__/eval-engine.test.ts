// @vitest-environment node
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

import { initSchema } from "@/lib/db-schema";
import {
  buildDefaultEvalConfig,
  formatEvalConfigYaml,
  parseEvalConfigYaml,
} from "../config";
import {
  createEvalScorerRegistry,
  listRegisteredScorers,
  scoreTraceWithEvalEngine,
} from "../engine";
import {
  listEvalRuns,
  persistEvalRun,
} from "../persistence";
import type { AgentEvalTrace, GoldenSetExample } from "../types";

const passingTrace: AgentEvalTrace = {
  traceId: "trace-pass",
  agentId: "codex",
  agentModelFamily: "openai",
  role: "engineering",
  input: "Resolve the billing sync issue with retained memory.",
  output: JSON.stringify({ status: "resolved", note: "Used memory before plan and completed the task." }),
  expectedFacts: ["resolved", "memory before plan"],
  toolCalls: [{ name: "memory.search", valid: true }],
  memory: {
    expectedFacts: ["billing sync decision"],
    retrievedFacts: ["billing sync decision"],
    recallAtK: 1,
    precisionAtK: 1,
    mrr: 1,
  },
  outcome: {
    completed: true,
    escalated: false,
    ttrMs: 12_000,
    operatorApproved: true,
    costUsd: 0.12,
  },
};

const stableGoldenSet: GoldenSetExample[] = [
  {
    id: "g1",
    role: "engineering",
    input: "Fix billing sync",
    expectedOutput: "resolved with memory before plan",
    humanScore: 1,
    trace: passingTrace,
  },
  {
    id: "g2",
    role: "support",
    input: "Handle escalation",
    expectedOutput: "resolved",
    humanScore: 1,
    trace: { ...passingTrace, traceId: "trace-g2", role: "support" },
  },
];

describe("eval engine core", () => {
  it("round-trips the locked yaml config shape", () => {
    const config = buildDefaultEvalConfig();
    const yaml = formatEvalConfigYaml(config);
    const parsed = parseEvalConfigYaml(yaml);

    expect(parsed.judgeModel.model).toBe("claude-haiku-4-5-20251001");
    expect(parsed.weights).toEqual({ l1: 0.2, l2: 0.5, l3: 0.3 });
    expect(parsed.driftGuard.goldenAgreementFloor).toBe(0.85);
    expect(parsed.scorers.l1Capability).toContain("memory_recall_l1");
    expect(parsed.scorers.l2Quality).toContain("memory_recall_l2");
  });

  it("registers L1, L2, L3, and memory recall scorers through one registry", () => {
    const registry = createEvalScorerRegistry();
    const scorers = listRegisteredScorers(registry);

    expect(scorers.some((scorer) => scorer.layer === "l1" && scorer.id === "tool_call_schema")).toBe(true);
    expect(scorers.some((scorer) => scorer.layer === "l2" && scorer.id === "rubric_5pt_faithful")).toBe(true);
    expect(scorers.some((scorer) => scorer.layer === "l3" && scorer.id === "completion_rate")).toBe(true);
    expect(scorers.some((scorer) => scorer.layer === "l1" && scorer.id === "memory_recall_l1")).toBe(true);
    expect(scorers.some((scorer) => scorer.layer === "l2" && scorer.id === "memory_recall_l2")).toBe(true);
  });

  it("returns normalized composite W with layer breakdown and scorer detail", () => {
    const result = scoreTraceWithEvalEngine({
      trace: passingTrace,
      config: buildDefaultEvalConfig(),
      goldenSet: stableGoldenSet,
    });

    expect(result.compositeW).toBeGreaterThanOrEqual(0);
    expect(result.compositeW).toBeLessThanOrEqual(1);
    expect(result.layers.l1.score).toBeGreaterThan(0.8);
    expect(result.layers.l2.score).toBeGreaterThan(0.8);
    expect(result.layers.l3.score).toBeGreaterThan(0.8);
    expect(result.trusted).toBe(true);
    expect(result.scorerResults.map((score) => score.scorerId)).toContain("memory_recall_l1");
    expect(result.judge.positionBiasMitigation.swapAugmentation).toBe(true);
  });

  it("halts trust when drift guard agreement falls below the floor", () => {
    const result = scoreTraceWithEvalEngine({
      trace: passingTrace,
      config: buildDefaultEvalConfig(),
      goldenSet: stableGoldenSet.map((example) => ({ ...example, humanScore: 0 })),
    });

    expect(result.trusted).toBe(false);
    expect(result.driftGuard.status).toBe("halted");
    expect(result.driftGuard.agreement).toBeLessThan(0.85);
  });

  it("blocks same-family agent and judge pairings", () => {
    expect(() =>
      scoreTraceWithEvalEngine({
        trace: { ...passingTrace, agentModelFamily: "anthropic" },
        config: buildDefaultEvalConfig(),
        goldenSet: stableGoldenSet,
      })
    ).toThrow(/same-family/i);
  });

  it("persists eval run history and per-example scores", () => {
    const db = new Database(":memory:");
    initSchema(db);
    const result = scoreTraceWithEvalEngine({
      trace: passingTrace,
      config: buildDefaultEvalConfig(),
      goldenSet: stableGoldenSet,
    });

    persistEvalRun(db, result);
    const runs = listEvalRuns(db, 5);

    expect(runs).toHaveLength(1);
    expect(runs[0]?.compositeW).toBe(result.compositeW);
    expect(runs[0]?.examples).toHaveLength(stableGoldenSet.length);
    expect(runs[0]?.judge.model).toBe("claude-haiku-4-5-20251001");
  });
});
