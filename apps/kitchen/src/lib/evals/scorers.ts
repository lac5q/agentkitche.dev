import { businessOpsL3Scorer } from "@/lib/l3/l3-scorer";
import { trajectoryMultiStepScorer } from "./trajectory-scorer";
import type { AgentEvalTrace, EvalScorer, EvalScorerResult, EvalScoringContext } from "./types";

function result(scorer: EvalScorer, score: number, detail: string, metadata?: Record<string, unknown>): EvalScorerResult {
  return {
    scorerId: scorer.id,
    layer: scorer.layer,
    score: Number(Math.max(0, Math.min(1, score)).toFixed(4)),
    detail,
    metadata,
  };
}

function average(values: number[], fallback = 0.5): number {
  if (values.length === 0) return fallback;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function includesFacts(output: string, facts: string[] = []): number {
  if (facts.length === 0) return 0.8;
  const normalized = output.toLowerCase();
  return facts.filter((fact) => normalized.includes(fact.toLowerCase())).length / facts.length;
}

function memoryRecallScore(trace: AgentEvalTrace): number {
  if (!trace.memory) return 0.5;
  if (typeof trace.memory.recallAtK === "number") return trace.memory.recallAtK;
  const expected = trace.memory.expectedFacts ?? [];
  const retrieved = new Set((trace.memory.retrievedFacts ?? []).map((fact) => fact.toLowerCase()));
  if (expected.length === 0) return 0.5;
  return expected.filter((fact) => retrieved.has(fact.toLowerCase())).length / expected.length;
}

export function createBuiltInScorers(): EvalScorer[] {
  return [
    {
      id: "tool_call_schema",
      label: "Tool call schema",
      layer: "l1",
      score(trace) {
        const calls = trace.toolCalls ?? [];
        if (calls.length === 0) return result(this, 0.75, "No tool calls; neutral capability score.");
        const valid = calls.filter((call) => call.valid !== false && call.schemaValid !== false).length;
        return result(this, valid / calls.length, `${valid}/${calls.length} tool calls matched schema.`);
      },
    },
    {
      id: "json_valid",
      label: "JSON valid",
      layer: "l1",
      score(trace) {
        try {
          JSON.parse(trace.output);
          return result(this, 1, "Output parsed as JSON.");
        } catch {
          return result(this, 0.7, "Output is plain text; JSON was not required by trace metadata.");
        }
      },
    },
    {
      id: "on_task",
      label: "On task",
      layer: "l1",
      score(trace) {
        const score = includesFacts(trace.output, trace.expectedFacts);
        return result(this, score, "Output covered expected task facts.");
      },
    },
    {
      id: "memory_recall_l1",
      label: "Memory recall capability",
      layer: "l1",
      score(trace) {
        return result(this, memoryRecallScore(trace), "Memory recall matched expected facts.", trace.memory);
      },
    },
    {
      id: "rubric_5pt_faithful",
      label: "Faithful",
      layer: "l2",
      score(_trace, context) {
        return result(this, context.judge.rubricScores.faithful, "Pinned judge faithfulness rubric score.");
      },
    },
    {
      id: "rubric_5pt_useful",
      label: "Useful",
      layer: "l2",
      score(_trace, context) {
        return result(this, context.judge.rubricScores.useful, "Pinned judge usefulness rubric score.");
      },
    },
    {
      id: "rubric_5pt_policy",
      label: "Policy",
      layer: "l2",
      score(_trace, context) {
        return result(this, context.judge.rubricScores.policy, "Pinned judge policy rubric score.");
      },
    },
    {
      id: "memory_recall_l2",
      label: "Memory recall quality",
      layer: "l2",
      score(trace) {
        const precision = trace.memory?.precisionAtK ?? memoryRecallScore(trace);
        const mrr = trace.memory?.mrr ?? memoryRecallScore(trace);
        return result(this, average([precision, mrr]), "Memory recall quality from precision and MRR.", trace.memory);
      },
    },
    // Phase 60: trajectory multi-step L2 scorer (safe to add — falls back for single-turn traces)
    trajectoryMultiStepScorer,
    {
      id: "completion_rate",
      label: "Completion",
      layer: "l3",
      score(trace) {
        return result(this, trace.outcome?.completed === true ? 1 : 0.5, "Task completion outcome.");
      },
    },
    {
      id: "escalation_rate",
      label: "Escalation",
      layer: "l3",
      score(trace) {
        return result(this, trace.outcome?.escalated === true ? 0 : 1, "Escalation avoidance outcome.");
      },
    },
    {
      id: "ttr_p50",
      label: "Time to resolution",
      layer: "l3",
      score(trace) {
        const ttr = trace.outcome?.ttrMs;
        if (typeof ttr !== "number") return result(this, 0.5, "No TTR signal; neutral outcome score.");
        return result(this, ttr <= 60_000 ? 1 : Math.max(0.2, 1 - ttr / 600_000), "Time-to-resolution outcome.");
      },
    },
    {
      id: "operator_approval",
      label: "Operator approval",
      layer: "l3",
      score(trace) {
        return result(this, trace.outcome?.operatorApproved === false ? 0 : 1, "Operator approval outcome.");
      },
    },
    {
      id: "cost_per_task",
      label: "Cost per task",
      layer: "l3",
      score(trace) {
        const cost = trace.outcome?.costUsd;
        if (typeof cost !== "number") return result(this, 0.5, "No cost signal; neutral outcome score.");
        return result(this, cost <= 0.25 ? 1 : Math.max(0.2, 1 - cost / 5), "Cost-per-task outcome.");
      },
    },
    // Phase 61: Business-ops L3 scorer reads from business_outcome_events table.
    businessOpsL3Scorer,
  ];
}

export function scorerIdsForLayer(context: EvalScoringContext, layer: "l1" | "l2" | "l3"): string[] {
  if (layer === "l1") return context.config.scorers.l1Capability;
  if (layer === "l2") return context.config.scorers.l2Quality;
  return context.config.scorers.l3Outcome;
}
