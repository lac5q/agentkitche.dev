import crypto from "crypto";

import { hashEvalConfig, weightsForAgent } from "./config";
import { hashGoldenSet } from "./golden-sets";
import { judgeTrace } from "./judge";
import { createBuiltInScorers, scorerIdsForLayer } from "./scorers";
import type {
  AgentEvalTrace,
  EvalConfig,
  EvalLayer,
  EvalLayerBreakdown,
  EvalRunResult,
  EvalScorer,
  EvalScoringContext,
  GoldenSetExample,
} from "./types";

export type EvalScorerRegistry = Map<string, EvalScorer>;

export function createEvalScorerRegistry(extraScorers: EvalScorer[] = []): EvalScorerRegistry {
  const registry = new Map<string, EvalScorer>();
  for (const scorer of [...createBuiltInScorers(), ...extraScorers]) {
    registry.set(scorer.id, scorer);
  }
  return registry;
}

export function listRegisteredScorers(registry = createEvalScorerRegistry()): EvalScorer[] {
  return Array.from(registry.values()).sort((a, b) => a.layer.localeCompare(b.layer) || a.id.localeCompare(b.id));
}

function average(scores: number[]): number {
  if (scores.length === 0) return 0.5;
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

function scoreLayer(
  layer: EvalLayer,
  context: EvalScoringContext,
  registry: EvalScorerRegistry,
  trace: AgentEvalTrace,
  weight: number
): EvalLayerBreakdown {
  const scorers = scorerIdsForLayer(context, layer)
    .map((id) => registry.get(id))
    .filter((scorer): scorer is EvalScorer => Boolean(scorer))
    .filter((scorer) => scorer.layer === layer);
  const results = scorers.map((scorer) => scorer.score(trace, context));
  return {
    score: Number(average(results.map((result) => result.score)).toFixed(4)),
    weight,
    scorers: results,
  };
}

function driftAgreement(config: EvalConfig, goldenSet: GoldenSetExample[]) {
  const examples = goldenSet.map((example) => {
    const trace = example.trace ?? {
      traceId: example.id,
      agentId: "golden-set",
      agentModelFamily: "openai",
      role: example.role,
      input: example.input,
      output: example.expectedOutput,
      expectedFacts: [example.expectedOutput],
      outcome: { completed: example.humanScore >= 0.5 },
    };
    const judge = judgeTrace(trace, config);
    const agreed = (judge.score >= 0.5) === (example.humanScore >= 0.5);
    return { id: example.id, humanScore: example.humanScore, judgeScore: judge.score, agreed };
  });
  const agreement = examples.length ? examples.filter((example) => example.agreed).length / examples.length : 1;
  return {
    status: agreement >= config.driftGuard.goldenAgreementFloor ? "passed" as const : "halted" as const,
    agreement: Number(agreement.toFixed(4)),
    floor: config.driftGuard.goldenAgreementFloor,
    goldenSetVersion: hashGoldenSet(goldenSet),
    examples,
  };
}

export function scoreTraceWithEvalEngine({
  trace,
  config,
  goldenSet,
  goldenSetPath = "./golden-sets/business-ops-50.jsonl",
  registry = createEvalScorerRegistry(),
}: {
  trace: AgentEvalTrace;
  config: EvalConfig;
  goldenSet: GoldenSetExample[];
  goldenSetPath?: string;
  registry?: EvalScorerRegistry;
}): EvalRunResult {
  if (trace.agentModelFamily && trace.agentModelFamily === config.judgeModel.modelFamily) {
    throw new Error(`Blocked same-family agent/judge pairing: ${trace.agentModelFamily}`);
  }

  const startedAt = new Date().toISOString();
  const judge = judgeTrace(trace, config);
  const context: EvalScoringContext = { config, judge, goldenSet };
  const weights = weightsForAgent(config, trace.agentId);
  const layers: Record<EvalLayer, EvalLayerBreakdown> = {
    l1: scoreLayer("l1", context, registry, trace, weights.l1),
    l2: scoreLayer("l2", context, registry, trace, weights.l2),
    l3: scoreLayer("l3", context, registry, trace, weights.l3),
  };

  // Null-L3 sentinel path (Phase 61): when all L3 scorers mark metadata.unavailable=true,
  // L3 has no business-outcome events yet. Exclude L3 from composite W and renormalize
  // over the available layers: W_adj = (w1·L1 + w2·L2) / (w1 + w2).
  const allL3Unavailable =
    layers.l3.scorers.length > 0 &&
    layers.l3.scorers.every((s) => s.metadata?.unavailable === true);

  let compositeW: number;
  if (allL3Unavailable) {
    const w1 = weights.l1;
    const w2 = weights.l2;
    const wSum = w1 + w2;
    compositeW = wSum > 0
      ? Number(((layers.l1.score * w1 + layers.l2.score * w2) / wSum).toFixed(4))
      : 0.5;
    console.warn(`[eval-engine] L3 unavailable for trace ${trace.traceId} — W renormalized over L1+L2 (${compositeW})`);
  } else {
    compositeW = Number((layers.l1.score * weights.l1 + layers.l2.score * weights.l2 + layers.l3.score * weights.l3).toFixed(4));
  }
  const driftGuard = driftAgreement(config, goldenSet);
  const completedAt = new Date().toISOString();

  return {
    id: `eval-run-${crypto.randomUUID()}`,
    traceId: trace.traceId,
    agentId: trace.agentId,
    role: trace.role ?? "default",
    compositeW,
    trusted: driftGuard.status === "passed",
    layers,
    scorerResults: [...layers.l1.scorers, ...layers.l2.scorers, ...layers.l3.scorers],
    judge,
    driftGuard,
    configHash: hashEvalConfig(config),
    goldenSetPath,
    startedAt,
    completedAt,
  };
}
