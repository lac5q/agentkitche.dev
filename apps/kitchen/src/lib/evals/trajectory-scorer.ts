import type { AgentEvalTrace, EvalScorer, EvalScorerResult, EvalScoringContext } from "./types";
import type { TrajectoryStep, TrajectoryTrace } from "./trajectory-types";

// Re-export types for consumers that import from this file.
export type { TrajectoryStep, TrajectoryTrace };

function result(scorer: EvalScorer, score: number, detail: string, metadata?: Record<string, unknown>): EvalScorerResult {
  return {
    scorerId: scorer.id,
    layer: scorer.layer,
    score: Number(Math.max(0, Math.min(1, score)).toFixed(4)),
    detail,
    metadata,
  };
}

/**
 * Scores a single trajectory step.
 *
 * Rubric:
 * - Start with the judge's average rubric score (faithful + useful + policy / 3).
 * - If any toolCalls in the step have `valid: false`, apply an escalation penalty of 0.15 per
 *   invalid call (capped so score never goes below 0).
 * - If the step outcome is `escalated: true`, apply an additional 0.1 penalty.
 */
function scoreStep(step: TrajectoryStep, judgeRubricAverage: number): number {
  let score = judgeRubricAverage;

  const invalidCalls = (step.toolCalls ?? []).filter((tc) => tc.valid === false).length;
  score -= invalidCalls * 0.15;

  if (step.outcome?.escalated === true) {
    score -= 0.1;
  }

  return Math.max(0, score);
}

/**
 * Returns the average of the judge's three rubric scores.
 * This is used as the neutral single-turn fallback and as the per-step base.
 */
function rubricAverage(context: EvalScoringContext): number {
  const { faithful, useful, policy } = context.judge.rubricScores;
  return (faithful + useful + policy) / 3;
}

/**
 * trajectory_multi_step — an L2 scorer that scores full multi-step agent traces.
 *
 * Behaviour:
 * - When `trace.steps` is present and non-empty: score each step, average.
 * - When `trace.steps` is absent or empty: return rubric average as a neutral
 *   fallback so this scorer is safe to include in the default L2 list without
 *   degrading single-turn golden-set examples.
 */
export const trajectoryMultiStepScorer: EvalScorer = {
  id: "trajectory_multi_step",
  label: "Trajectory multi-step",
  layer: "l2",

  score(trace: AgentEvalTrace, context: EvalScoringContext): EvalScorerResult {
    const trajectoryTrace = trace as Partial<TrajectoryTrace>;
    const steps = trajectoryTrace.steps;

    // Fallback: no steps present — return neutral rubric average
    if (!steps || steps.length === 0) {
      const avg = rubricAverage(context);
      return result(
        this,
        avg,
        "No trajectory steps present; returning rubric average as neutral fallback.",
        { fallback: true }
      );
    }

    const base = rubricAverage(context);
    const stepScores = steps.map((step) => scoreStep(step, base));
    const avg = stepScores.reduce((sum, s) => sum + s, 0) / stepScores.length;

    return result(
      this,
      avg,
      `Scored ${steps.length} trajectory steps; step scores: [${stepScores.map((s) => s.toFixed(3)).join(", ")}].`,
      {
        stepCount: steps.length,
        stepScores,
        rubricBase: base,
      }
    );
  },
};

/**
 * Registers the trajectory scorer into the provided scorer registry.
 * Called from scorers.ts during createBuiltInScorers().
 */
export function registerTrajectoryScorer(
  registry: { set: (id: string, scorer: EvalScorer) => void }
): void {
  registry.set(trajectoryMultiStepScorer.id, trajectoryMultiStepScorer);
}
