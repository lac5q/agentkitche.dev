import type { AgentEvalTrace } from "./types";

/**
 * A single step in a multi-step agent trajectory.
 * Steps are ordered by stepIndex (0-based).
 */
export interface TrajectoryStep {
  stepIndex: number;
  input: string;
  output: string;
  toolCalls?: AgentEvalTrace["toolCalls"];
  outcome?: AgentEvalTrace["outcome"];
  intermediateState?: Record<string, unknown>;
}

/**
 * A trajectory trace extends the flat AgentEvalTrace with an ordered steps
 * array and a final output field.
 *
 * TrajectoryTrace is backward-compatible: existing single-turn scorer code
 * receives the aggregate trace (input/output) unchanged; the trajectory scorer
 * operates on steps when present.
 */
export interface TrajectoryTrace extends AgentEvalTrace {
  steps: TrajectoryStep[];
  finalOutput: string;
}
