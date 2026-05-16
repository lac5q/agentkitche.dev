/**
 * Phase 61 — Business-Ops Outcome Layer (L3)
 * Core types for the two-stage adapter architecture.
 */

export type BusinessOutcomeCategory = "crm" | "helpdesk" | "finance";

/**
 * A single business outcome event persisted in `business_outcome_events`.
 * This is the canonical row shape shared between adapters (write) and the L3
 * scorer (read).
 */
export interface BusinessOutcomeEvent {
  /** Auto-assigned INTEGER PRIMARY KEY from SQLite; undefined before insertion. */
  id?: number;
  tenantId: string;
  correlationId: string;
  /** Logical source category matching the DB CHECK constraint. */
  sourceSystem: BusinessOutcomeCategory;
  /** Adapter name (e.g. "hubspot", "intercom", "quickbooks"). */
  adapter: string;
  /** Semantic event type (e.g. "deal_advance", "conversation_resolved"). */
  eventType: string;
  /** KPI key computed from this event (e.g. "completion_rate"). */
  kpiKey: string;
  /** Normalized KPI value in [0, 1]. */
  kpiValue: number;
  /** Full raw payload as JSON string. */
  rawJson: string;
  /** ISO-8601 timestamp of when the external system recorded the event. */
  polledAt: string;
  /** Optional: agent that handled the correlated task. */
  agentId?: string;
}

/**
 * Config block for a single adapter instance.
 * The `mock` flag bypasses real HTTP calls for unit tests.
 */
export interface L3AdapterConfig {
  name: string;
  category: BusinessOutcomeCategory;
  /** When true the adapter returns fixture data without making real API calls. */
  mock: boolean;
}

/**
 * Aggregated KPI signal produced from one or more BusinessOutcomeEvents for a
 * single correlation_id. Used by the L3 scorer to produce a weighted score.
 */
export interface KpiSignal {
  completionRate: number | null;
  escalationRate: number | null;
  ttrP50Ms: number | null;
  approvalRate: number | null;
  costPerTask: number | null;
}

/**
 * Input to the L3 scorer: correlation_id lookup result from the event store.
 */
export interface L3ScorerInput {
  correlationId: string;
  events: BusinessOutcomeEvent[];
  kpis: KpiSignal;
}
