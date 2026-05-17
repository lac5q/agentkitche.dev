// @vitest-environment node
import Database from "better-sqlite3";
import { describe, expect, it } from "vitest";

import { initSchema } from "@/lib/db-schema";
import { persistEvalRun } from "@/lib/evals/persistence";
import type { EvalRunResult } from "@/lib/evals/types";
import { applyProposalWithService } from "../apply";
import * as auditModule from "../audit";
import { writeAuditEntry } from "../audit";
import { ensureProposalType } from "../proposal-registry";
import { reflectOnTraceWithService } from "../reflection";
import { SealService } from "../service";

function run(overrides: Partial<EvalRunResult> = {}): EvalRunResult {
  const base: EvalRunResult = {
    id: "run-low",
    traceId: "trace-low",
    agentId: "agent-1",
    role: "ops",
    compositeW: 0.42,
    trusted: true,
    layers: {
      l1: { score: 0.4, weight: 0.2, scorers: [] },
      l2: { score: 0.42, weight: 0.5, scorers: [] },
      l3: { score: 0.45, weight: 0.3, scorers: [] },
    },
    scorerResults: [],
    judge: {
      score: 0.42,
      rubricScores: { faithful: 0.4, useful: 0.42, policy: 0.45 },
      model: "judge",
      provider: "local",
      modelFamily: "local",
      promptTemplateVersion: "v1",
      promptHash: "hash",
      positionBiasMitigation: { swapAugmentation: true, orderAgreement: true },
    },
    driftGuard: {
      status: "passed",
      agreement: 1,
      floor: 0.85,
      goldenSetVersion: "golden",
      examples: [],
    },
    configHash: "config",
    goldenSetPath: "./golden.jsonl",
    startedAt: "2026-05-15T00:00:00.000Z",
    completedAt: "2026-05-15T00:00:01.000Z",
  };
  return { ...base, ...overrides };
}

function service(db: Database.Database, postRun: EvalRunResult) {
  return new SealService({
    db,
    evalService: {
      getRunById: (runId) => {
        const row = db
          .prepare("SELECT id, trace_id, composite_w FROM eval_runs WHERE id = ?")
          .get(runId) as { id: string; trace_id: string; composite_w: number } | undefined;
        if (!row) return null;
        return run({ id: row.id, traceId: row.trace_id, compositeW: row.composite_w });
      },
      runForTrace: () => postRun,
    },
    config: {
      seal: { reflectionThreshold: 0.6, autoApply: false, proposalTypes: ["noop_test"] },
    },
  });
}

describe("SEAL self-improvement substrate", () => {
  it("reflects low-W traces and ignores traces at or above the threshold", async () => {
    const db = new Database(":memory:");
    initSchema(db);
    persistEvalRun(db, run());
    persistEvalRun(db, run({ id: "run-high", traceId: "trace-high", compositeW: 0.72 }));

    const low = await reflectOnTraceWithService(service(db, run()), "trace-low", "run-low");
    const high = await reflectOnTraceWithService(service(db, run()), "trace-high", "run-high");

    expect(low).toHaveLength(1);
    expect(low[0]?.proposalType).toBe("noop_test");
    expect(low[0]?.forecastWDelta).toBeGreaterThanOrEqual(0);
    expect(high).toEqual([]);
  });

  it("rejects unknown proposal types through the closed registry", () => {
    expect(() => ensureProposalType("unknown_type")).toThrow(/Unknown SEAL proposal type/);
  });

  it("keeps applied proposals when post-apply W is not below the baseline", async () => {
    const db = new Database(":memory:");
    initSchema(db);
    persistEvalRun(db, run());
    const seal = service(db, run({ id: "run-post", compositeW: 0.5 }));
    const [proposal] = await seal.reflectOnTrace("trace-low", "run-low");
    await seal.approveProposal(proposal.id, { operator: "test", reasoning: "ok" });

    const result = await applyProposalWithService(seal, proposal.id);
    const stored = seal.getProposal(proposal.id);

    expect(result.kept).toBe(true);
    expect(stored?.status).toBe("applied");
    expect(seal.queryAuditLog({ proposalId: proposal.id }).map((entry) => entry.event)).toContain("apply_succeeded");
  });

  it("rolls back proposals when post-apply W regresses", async () => {
    const db = new Database(":memory:");
    initSchema(db);
    persistEvalRun(db, run());
    const seal = service(db, run({ id: "run-post", compositeW: 0.2 }));
    const [proposal] = await seal.reflectOnTrace("trace-low", "run-low");
    await seal.approveProposal(proposal.id, { operator: "test", reasoning: "ok" });

    const result = await applyProposalWithService(seal, proposal.id);
    const stored = seal.getProposal(proposal.id);

    expect(result.kept).toBe(false);
    expect(stored?.status).toBe("rolled_back");
    expect(seal.queryAuditLog({ proposalId: proposal.id }).map((entry) => entry.event)).toContain("rolled_back");
  });

  it("exposes append-only audit helpers with no update or delete API", () => {
    const db = new Database(":memory:");
    initSchema(db);
    writeAuditEntry({
      proposalId: "proposal-1",
      event: "proposed",
      baselineW: 0.4,
      detail: { source: "test" },
    }, db);

    expect(Object.keys(auditModule)).toEqual(
      expect.arrayContaining(["writeAuditEntry", "queryAuditLog"])
    );
    expect(Object.keys(auditModule).some((name) => /update|delete/i.test(name))).toBe(false);
  });
});
