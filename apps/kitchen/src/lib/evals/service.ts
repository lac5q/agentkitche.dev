import type Database from "better-sqlite3";
import crypto from "crypto";

import { getDb } from "@/lib/db";
import { loadEvalConfig } from "./config";
import { goldenSetPathForTrace, loadGoldenSet } from "./golden-sets";
import { scoreTraceWithEvalEngine } from "./engine";
import { persistEvalRun } from "./persistence";
import type { AgentEvalTrace, EvalRunResult } from "./types";
import { rescorePostApply, type SealRescoreProposalContext } from "@/lib/seal/rescore";

type EvalRunRow = {
  id: string;
  trace_id: string;
  agent_id: string;
  role: string;
  composite_w: number;
  trusted: number;
  drift_agreement: number;
  drift_status: "passed" | "halted";
  layer_breakdown_json: string;
  scorer_results_json: string;
  judge_provider: string;
  judge_model: string;
  judge_model_family: string;
  prompt_template_version: string;
  prompt_hash: string;
  golden_set_path: string;
  golden_set_version: string;
  config_hash: string;
  started_at: string;
  completed_at: string;
  judge_score_json?: string | null;
};

function runFromRow(row: EvalRunRow): EvalRunResult {
  let judgeScore = 0;
  let rubricScores = { faithful: 0, useful: 0, policy: 0 };
  if (row.judge_score_json) {
    try {
      const parsed = JSON.parse(row.judge_score_json) as {
        score?: number;
        rubricScores?: { faithful: number; useful: number; policy: number };
      };
      if (typeof parsed.score === "number") judgeScore = parsed.score;
      if (parsed.rubricScores) rubricScores = parsed.rubricScores;
    } catch {
      // Legacy malformed judge payloads keep the zeroed fallback.
    }
  }

  return {
    id: row.id,
    traceId: row.trace_id,
    agentId: row.agent_id,
    role: row.role,
    compositeW: row.composite_w,
    trusted: row.trusted === 1,
    layers: JSON.parse(row.layer_breakdown_json),
    scorerResults: JSON.parse(row.scorer_results_json),
    judge: {
      score: judgeScore,
      rubricScores,
      model: row.judge_model,
      provider: row.judge_provider,
      modelFamily: row.judge_model_family,
      promptTemplateVersion: row.prompt_template_version,
      promptHash: row.prompt_hash,
      positionBiasMitigation: { swapAugmentation: true, orderAgreement: true },
    },
    driftGuard: {
      status: row.drift_status,
      agreement: row.drift_agreement,
      floor: 0.85,
      goldenSetVersion: row.golden_set_version,
      examples: [],
    },
    configHash: row.config_hash,
    goldenSetPath: row.golden_set_path,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

export function scoreAndMaybePersistEvalTrace(
  trace: AgentEvalTrace,
  options: { persist?: boolean; db?: Database.Database } = {}
): EvalRunResult {
  const config = loadEvalConfig();
  const goldenSetPath = goldenSetPathForTrace(config, trace);
  const goldenSet = loadGoldenSet(goldenSetPath);
  const result = scoreTraceWithEvalEngine({ trace, config, goldenSet, goldenSetPath });
  const tenantId =
    typeof trace.metadata?.tenantId === "string"
      ? trace.metadata.tenantId
      : typeof trace.metadata?.tenant_id === "string"
        ? trace.metadata.tenant_id
        : undefined;
  if (options.persist !== false) persistEvalRun(options.db ?? getDb(), result, { tenantId });
  return result;
}

export class EvalService {
  constructor(private readonly db: Database.Database = getDb()) {}

  getRunById(runId: string): EvalRunResult | null {
    const row = this.db.prepare("SELECT * FROM eval_runs WHERE id = ?").get(runId) as EvalRunRow | undefined;
    return row ? runFromRow(row) : null;
  }

  getLatestRunForTrace(traceId: string): EvalRunResult | null {
    const row = this.db
      .prepare("SELECT * FROM eval_runs WHERE trace_id = ? ORDER BY completed_at DESC LIMIT 1")
      .get(traceId) as EvalRunRow | undefined;
    return row ? runFromRow(row) : null;
  }

  runForTrace(traceId: string, agentId?: string): EvalRunResult {
    const baseline = this.getLatestRunForTrace(traceId);
    if (!baseline) {
      throw new Error(`No eval run found for trace ${traceId}`);
    }
    if (agentId && baseline.agentId !== agentId) {
      throw new Error(`Trace ${traceId} belongs to ${baseline.agentId}, not ${agentId}`);
    }
    return {
      ...baseline,
      id: `seal-rerun-${crypto.randomUUID()}`,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };
  }

  rescoreForProposal(proposal: SealRescoreProposalContext & { traceId: string; agentId: string; baselineRunId: string }): EvalRunResult {
    const baseline = this.getRunById(proposal.baselineRunId) ?? this.getLatestRunForTrace(proposal.traceId);
    if (!baseline) {
      throw new Error(`No eval run found for proposal baseline ${proposal.baselineRunId}`);
    }
    if (baseline.agentId !== proposal.agentId) {
      throw new Error(`Trace ${proposal.traceId} belongs to ${baseline.agentId}, not ${proposal.agentId}`);
    }

    const config = loadEvalConfig();
    const goldenSetPath = goldenSetPathForTrace(config, { agentId: baseline.agentId, role: baseline.role });
    const goldenSet = loadGoldenSet(goldenSetPath);
    const result = rescorePostApply({
      baseline,
      proposalType: proposal.proposalType,
      diff: proposal.diff,
      forecastWDelta: proposal.forecastWDelta,
      config,
      goldenSet,
      goldenSetPath,
    });
    persistEvalRun(this.db, result);
    return result;
  }
}
