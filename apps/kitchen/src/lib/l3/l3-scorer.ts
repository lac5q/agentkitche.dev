/**
 * Phase 61 — Business-Ops Outcome Layer (L3)
 * BusinessOpsL3Scorer: implements EvalScorer and reads from business_outcome_events.
 *
 * Returns a null-sentinel result (score: 0, metadata.unavailable: true) when no
 * events exist for the trace's correlationId. The engine null-L3 path in
 * engine.ts checks for this sentinel and renormalizes weights over L1+L2.
 *
 * Per-company weights are read from EvalConfig.companies (if present) using the
 * company_id field on the trace metadata.
 */

import { getDb } from "@/lib/db";
import type { AgentEvalTrace, EvalScorer, EvalScorerResult, EvalScoringContext } from "@/lib/evals/types";
import type { BusinessOutcomeEvent, KpiSignal } from "./types";

/** Default L3 sub-weights (sum = 1.0). */
const DEFAULT_WEIGHTS: Record<string, number> = {
  completion_rate: 0.35,
  escalation_rate: 0.25,
  ttr_p50: 0.20,
  approval_rate: 0.10,
  cost_per_task: 0.10,
};

/**
 * Read events from the database for a given correlationId.
 * Isolated into a helper for testability.
 */
export function readEventsForCorrelation(correlationId: string): BusinessOutcomeEvent[] {
  try {
    const db = getDb();
    const rows = db
      .prepare<[string], {
        id: number;
        tenant_id: string;
        correlation_id: string;
        source_system: string;
        adapter: string;
        event_type: string;
        kpi_key: string;
        kpi_value: number;
        raw_json: string;
        agent_id: string | null;
        polled_at: string;
      }>(
        `SELECT id, tenant_id, correlation_id, source_system, adapter, event_type,
                kpi_key, kpi_value, raw_json, agent_id, polled_at
         FROM business_outcome_events
         WHERE correlation_id = ?
         ORDER BY polled_at DESC`
      )
      .all(correlationId);

    return rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      correlationId: r.correlation_id,
      sourceSystem: r.source_system as BusinessOutcomeEvent["sourceSystem"],
      adapter: r.adapter,
      eventType: r.event_type,
      kpiKey: r.kpi_key,
      kpiValue: r.kpi_value,
      rawJson: r.raw_json,
      agentId: r.agent_id ?? undefined,
      polledAt: r.polled_at,
    }));
  } catch {
    // DB not available in test environments without initSchema — return empty.
    return [];
  }
}

/**
 * Aggregate BusinessOutcomeEvents into a KpiSignal by averaging kpi_value per kpi_key.
 */
export function aggregateKpis(events: BusinessOutcomeEvent[]): KpiSignal {
  if (events.length === 0) {
    return {
      completionRate: null,
      escalationRate: null,
      ttrP50Ms: null,
      approvalRate: null,
      costPerTask: null,
    };
  }

  function avgForKey(key: string): number | null {
    const vals = events.filter((e) => e.kpiKey === key).map((e) => e.kpiValue);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }

  return {
    completionRate: avgForKey("completion_rate"),
    escalationRate: avgForKey("escalation_rate"),
    ttrP50Ms: avgForKey("ttr_p50"),
    approvalRate: avgForKey("approval_rate"),
    costPerTask: avgForKey("cost_per_task"),
  };
}

/**
 * Resolve per-company L3 sub-weights from EvalConfig.companies.
 * Falls back to DEFAULT_WEIGHTS if the company is not configured.
 */
function resolveCompanyWeights(
  context: EvalScoringContext,
  companyId: string | undefined
): Record<string, number> {
  if (!companyId) return DEFAULT_WEIGHTS;
  const companyConfig = context.config.companies?.[companyId];
  if (!companyConfig?.l3_sub_weights) return DEFAULT_WEIGHTS;
  // CompanyL3SubWeights keys are a strict subset of the canonical KPI keys
  return companyConfig.l3_sub_weights as unknown as Record<string, number>;
}

/**
 * Compute a weighted composite score from a KpiSignal using per-company weights.
 * Only includes KPIs that are non-null in the weighted average.
 */
export function computeWeightedScore(
  kpis: KpiSignal,
  weights: Record<string, number>
): number {
  const kpiMap: Record<string, number | null> = {
    completion_rate: kpis.completionRate,
    escalation_rate: kpis.escalationRate,
    ttr_p50: kpis.ttrP50Ms,
    approval_rate: kpis.approvalRate,
    cost_per_task: kpis.costPerTask,
  };

  let weightedSum = 0;
  let totalWeight = 0;

  for (const [key, value] of Object.entries(kpiMap)) {
    if (value === null) continue;
    const w = weights[key] ?? 0;
    weightedSum += value * w;
    totalWeight += w;
  }

  if (totalWeight === 0) return 0.5;
  return Math.max(0, Math.min(1, weightedSum / totalWeight));
}

export const businessOpsL3Scorer: EvalScorer = {
  id: "business_ops_l3",
  label: "Business Ops Outcome",
  layer: "l3",

  score(trace: AgentEvalTrace, context: EvalScoringContext): EvalScorerResult {
    const events = readEventsForCorrelation(trace.traceId);

    // Null-sentinel: no business-outcome events yet for this correlation ID.
    if (events.length === 0) {
      return {
        scorerId: this.id,
        layer: this.layer,
        score: 0,
        detail: "No business-outcome events found for this correlation_id; L3 not yet available.",
        metadata: { unavailable: true },
      };
    }

    const kpis = aggregateKpis(events);
    const companyId = typeof trace.metadata?.company_id === "string" ? trace.metadata.company_id : undefined;
    const weights = resolveCompanyWeights(context, companyId);
    const score = computeWeightedScore(kpis, weights);

    return {
      scorerId: this.id,
      layer: this.layer,
      score: Number(score.toFixed(4)),
      detail: `Business-ops L3 score from ${events.length} events (${Object.keys(kpis).filter((k) => kpis[k as keyof KpiSignal] !== null).length}/5 KPIs available).`,
      metadata: {
        unavailable: false,
        eventCount: events.length,
        kpis,
        companyId,
      },
    };
  },
};
