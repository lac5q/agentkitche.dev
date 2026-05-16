import crypto from "crypto";
import type Database from "better-sqlite3";

import { getDb } from "@/lib/db";
import { loadEvalConfig } from "@/lib/evals/config";
import { EvalService } from "@/lib/evals/service";
import type { EvalConfig, EvalRunResult } from "@/lib/evals/types";
import { queryAuditLog, writeAuditEntry } from "./audit";
import { ensureProposalType, registryEntryFor } from "./proposal-registry";
import { sealRescoreMetadata, type SealRescoreProposalContext } from "./rescore";
import type {
  ApplyResult,
  AuditFilter,
  ProposalCommandAction,
  ProposalDecisionAction,
  ProposalDraft,
  ProposalStatus,
  SealDecision,
  SealProposal,
  StoredSealAuditEntry,
  WLayerDelta,
} from "./types";
import { layerScore } from "./types";

type ProposalRow = {
  id: string;
  trace_id: string;
  run_id: string;
  agent_id: string;
  proposal_type: string;
  status: ProposalStatus;
  diff_json: string;
  rationale: string;
  forecast_w_delta: number;
  baseline_w: number;
  baseline_run_id: string;
  baseline_layer_json: string;
  created_at: string;
  updated_at: string;
};

type DecisionInput = {
  operator?: string;
  reasoning?: string;
};

export interface EvalServiceLike {
  getRunById(runId: string): EvalRunResult | null;
  runForTrace(traceId: string, agentId?: string, goldenSetPath?: string): EvalRunResult | Promise<EvalRunResult>;
  rescoreForProposal?(
    proposal: SealRescoreProposalContext & { traceId: string; agentId: string; baselineRunId: string }
  ): EvalRunResult | Promise<EvalRunResult>;
}

export interface SealServiceOptions {
  db?: Database.Database;
  evalService?: EvalServiceLike;
  config?: Pick<EvalConfig, "seal">;
}

function now() {
  return new Date().toISOString();
}

function rowToProposal(row: ProposalRow): SealProposal {
  return {
    id: row.id,
    traceId: row.trace_id,
    runId: row.run_id,
    agentId: row.agent_id,
    proposalType: ensureProposalType(row.proposal_type),
    status: row.status,
    diff: JSON.parse(row.diff_json),
    rationale: row.rationale,
    forecastWDelta: row.forecast_w_delta,
    baselineW: row.baseline_w,
    baselineRunId: row.baseline_run_id,
    baselineLayers: JSON.parse(row.baseline_layer_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function deltas(baseline: EvalRunResult["layers"], post: EvalRunResult["layers"], baselineW: number, postW: number): WLayerDelta {
  return {
    l1: layerScore(post, "l1") - layerScore(baseline, "l1"),
    l2: layerScore(post, "l2") - layerScore(baseline, "l2"),
    l3: layerScore(post, "l3") - layerScore(baseline, "l3"),
    composite: postW - baselineW,
  };
}

function auditDetailForRun(postRun: EvalRunResult, detail: Record<string, unknown>): Record<string, unknown> {
  const rescore = sealRescoreMetadata(postRun);
  return rescore ? { ...detail, ...rescore } : detail;
}

export class SealService {
  private readonly db: Database.Database;
  private readonly evalService: EvalServiceLike;
  private readonly config: Pick<EvalConfig, "seal">;

  constructor(options: SealServiceOptions = {}) {
    this.db = options.db ?? getDb();
    this.evalService = options.evalService ?? new EvalService(this.db);
    this.config = options.config ?? loadEvalConfig();
  }

  buildProposalDrafts(traceId: string, runId: string): ProposalDraft[] {
    const run = this.evalService.getRunById(runId);
    if (!run) throw new Error(`Eval run not found: ${runId}`);
    if (run.traceId !== traceId) throw new Error(`Eval run ${runId} does not belong to trace ${traceId}`);
    if (run.compositeW >= this.config.seal.reflectionThreshold) return [];

    return this.config.seal.proposalTypes.map((type) => {
      const entry = registryEntryFor(type);
      return {
        proposalType: ensureProposalType(type),
        ...entry.buildDraft({
          traceId,
          runId,
          agentId: run.agentId,
          baselineW: run.compositeW,
          baselineLayers: run.layers,
        }),
      };
    });
  }

  async reflectOnTrace(traceId: string, runId: string): Promise<SealProposal[]> {
    return this.buildProposalDrafts(traceId, runId).map((draft) => this.createProposal(draft));
  }

  createProposal(draft: ProposalDraft): SealProposal {
    const id = `seal-proposal-${crypto.randomUUID()}`;
    const timestamp = now();
    this.db.prepare(
      "INSERT INTO seal_proposals (" +
        "id, trace_id, run_id, agent_id, proposal_type, status, diff_json, rationale, forecast_w_delta," +
        "baseline_w, baseline_run_id, baseline_layer_json, created_at, updated_at" +
      ") VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?)"
    ).run(
      id,
      draft.traceId,
      draft.runId,
      draft.agentId,
      draft.proposalType,
      JSON.stringify(draft.diff),
      draft.rationale,
      draft.forecastWDelta,
      draft.baselineW,
      draft.baselineRunId,
      JSON.stringify(draft.baselineLayers),
      timestamp,
      timestamp
    );
    writeAuditEntry({
      proposalId: id,
      event: "proposed",
      baselineW: draft.baselineW,
      detail: { proposalType: draft.proposalType, traceId: draft.traceId, runId: draft.runId },
    }, this.db);
    return this.getProposal(id) as SealProposal;
  }

  listProposals(filter: { status?: ProposalStatus } = {}): SealProposal[] {
    const rows = filter.status
      ? this.db
          .prepare("SELECT * FROM seal_proposals WHERE status = ? ORDER BY created_at DESC")
          .all(filter.status)
      : this.db.prepare("SELECT * FROM seal_proposals ORDER BY created_at DESC").all();
    return (rows as ProposalRow[]).map(rowToProposal);
  }

  getProposal(proposalId: string): SealProposal | null {
    const row = this.db.prepare("SELECT * FROM seal_proposals WHERE id = ?").get(proposalId) as ProposalRow | undefined;
    return row ? rowToProposal(row) : null;
  }

  async handleAction(
    proposalId: string,
    action: ProposalCommandAction,
    input: DecisionInput = {}
  ): Promise<{ proposal: SealProposal; decision?: SealDecision; apply?: ApplyResult }> {
    if (action === "approve") {
      const decision = this.approveProposal(proposalId, input);
      return { proposal: this.getProposal(proposalId) as SealProposal, decision };
    }
    if (action === "reject") {
      const decision = this.rejectProposal(proposalId, input);
      return { proposal: this.getProposal(proposalId) as SealProposal, decision };
    }
    const apply = await this.applyProposal(proposalId);
    return { proposal: this.getProposal(proposalId) as SealProposal, apply };
  }

  approveProposal(proposalId: string, input: DecisionInput = {}): SealDecision {
    return this.transitionProposal(proposalId, "approved", input, "approved");
  }

  rejectProposal(proposalId: string, input: DecisionInput = {}): SealDecision {
    return this.transitionProposal(proposalId, "rejected", input, "rejected");
  }

  async applyProposal(proposalId: string): Promise<ApplyResult> {
    const proposal = this.getProposal(proposalId);
    if (!proposal) throw new Error(`SEAL proposal not found: ${proposalId}`);
    if (proposal.status !== "approved" && proposal.status !== "pending") {
      throw new Error(`Cannot apply proposal in ${proposal.status} state`);
    }

    writeAuditEntry({
      proposalId,
      event: "apply_started",
      baselineW: proposal.baselineW,
      detail: { proposalType: proposal.proposalType },
    }, this.db);

    const entry = registryEntryFor(proposal.proposalType);
    let postRun: EvalRunResult;
    let applyResult: Record<string, unknown>;
    try {
      applyResult = this.db.transaction(() => entry.applyShadow(proposal.diff, this.db))() as Record<string, unknown>;
      if (applyResult?.applied === false) {
        throw new Error(typeof applyResult.reason === "string" ? applyResult.reason : "SEAL shadow apply failed");
      }
      postRun = this.evalService.rescoreForProposal
        ? await this.evalService.rescoreForProposal({
            traceId: proposal.traceId,
            agentId: proposal.agentId,
            baselineRunId: proposal.baselineRunId,
            proposalType: proposal.proposalType,
            diff: proposal.diff,
            forecastWDelta: proposal.forecastWDelta,
          })
        : await this.evalService.runForTrace(proposal.traceId, proposal.agentId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "SEAL apply failed";
      writeAuditEntry({
        proposalId,
        event: "apply_failed",
        baselineW: proposal.baselineW,
        detail: { error: message },
      }, this.db);
      this.transitionProposal(proposalId, "rolled_back", { operator: "system", reasoning: message }, "rolled_back");
      return {
        proposalId,
        kept: false,
        baselineW: proposal.baselineW,
        postApplyW: null,
        deltaComposite: null,
        status: "rolled_back",
        error: message,
      };
    }

    const delta = deltas(proposal.baselineLayers, postRun.layers, proposal.baselineW, postRun.compositeW);
    const kept = postRun.compositeW >= proposal.baselineW;
    if (kept) {
      const decision = this.transitionProposal(proposalId, "applied", { operator: "system", reasoning: "Composite W did not regress" }, "applied");
      writeAuditEntry({
        proposalId,
        event: "apply_succeeded",
        baselineW: proposal.baselineW,
        postApplyW: postRun.compositeW,
        deltaL1: delta.l1,
        deltaL2: delta.l2,
        deltaL3: delta.l3,
        deltaComposite: delta.composite,
        detail: auditDetailForRun(postRun, { evalRunId: postRun.id, decisionId: decision.id }),
      }, this.db);
      return {
        proposalId,
        kept: true,
        baselineW: proposal.baselineW,
        postApplyW: postRun.compositeW,
        deltaComposite: delta.composite,
        status: "applied",
        evalRunId: postRun.id,
      };
    }

    if (entry.rollbackShadow) {
      this.db.transaction(() => {
        entry.rollbackShadow?.(proposal.diff, applyResult, this.db);
      })();
    }
    this.transitionProposal(proposalId, "rolled_back", { operator: "system", reasoning: "Composite W regressed" }, "rolled_back");
    writeAuditEntry({
      proposalId,
      event: "rolled_back",
      baselineW: proposal.baselineW,
      postApplyW: postRun.compositeW,
      deltaL1: delta.l1,
      deltaL2: delta.l2,
      deltaL3: delta.l3,
      deltaComposite: delta.composite,
      detail: auditDetailForRun(postRun, { evalRunId: postRun.id }),
    }, this.db);
    return {
      proposalId,
      kept: false,
      baselineW: proposal.baselineW,
      postApplyW: postRun.compositeW,
      deltaComposite: delta.composite,
      status: "rolled_back",
      evalRunId: postRun.id,
    };
  }

  queryAuditLog(filter: AuditFilter = {}): StoredSealAuditEntry[] {
    return queryAuditLog(filter, this.db);
  }

  private transitionProposal(
    proposalId: string,
    status: ProposalStatus,
    input: DecisionInput,
    action: ProposalDecisionAction
  ): SealDecision {
    const proposal = this.getProposal(proposalId);
    if (!proposal) throw new Error(`SEAL proposal not found: ${proposalId}`);
    const decision: SealDecision = {
      id: `seal-decision-${crypto.randomUUID()}`,
      proposalId,
      action,
      operator: input.operator ?? "operator",
      reasoning: input.reasoning ?? null,
      decidedAt: now(),
    };
    this.db.prepare(
      "INSERT INTO seal_proposal_decisions (id, proposal_id, action, operator, reasoning, decided_at)" +
      " VALUES (?, ?, ?, ?, ?, ?)"
    ).run(decision.id, proposalId, action, decision.operator, decision.reasoning, decision.decidedAt);
    this.db.prepare("UPDATE seal_proposals SET status = ?, updated_at = ? WHERE id = ?").run(status, now(), proposalId);
    if (action === "approved" || action === "rejected") {
      writeAuditEntry({
        proposalId,
        event: action,
        baselineW: proposal.baselineW,
        detail: { operator: decision.operator, reasoning: decision.reasoning },
      }, this.db);
    }
    return decision;
  }
}
