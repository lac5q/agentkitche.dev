---
phase: 61
name: Business-Ops Outcome Layer (L3)
status: ready-for-planning
gathered: 2026-05-15
---

# Phase 61: Business-Ops Outcome Layer (L3) — Context

<domain>
## Phase Boundary

Phase 61 closes the L3 layer of composite `W` with real post-hoc business signal. It ships: a trace post-hoc metric extractor that produces the canonical Anthropic + Fin/Intercom KPI set, a `business_outcome_events` store that decouples async adapter pulls from synchronous L3 scorer reads, three adapter categories (CRM, helpdesk, finance) with one live integration per category and mocked fixtures for the other two, per-company L3 KPI weighting in `memroos.eval.yaml`, and a `/business-ops` dashboard showing per-agent `W` over time.

### In scope

- `business_outcome_events` table: persists outcome events pulled from external systems, keyed by `correlation_id`. This is the adapter→scorer decoupling layer.
- Canonical KPI extractor: computes `completion_rate`, `escalation_rate`, `ttr_p50`, `operator_approval_rate`, `cost_per_task` from the trace + any `business_outcome_events` rows matching its `correlation_id`.
- Adapter interface: `BusinessSystemAdapter.pull(correlationIds: string[]): Promise<BusinessOutcomeEvent[]>` + a write helper. Adapters are invoked by a scheduled poll or incoming webhook, not by the scorer at run time.
- Three adapter categories (L3-02, L3-03, L3-04), each with one live v1 integration and one mocked fixture:
  - CRM: **HubSpot** (live, OAuth-based) + Salesforce (mock fixture)
  - Helpdesk: **Intercom** (live, bearer token) + Zendesk (mock fixture)
  - Finance: **QuickBooks** (live, OAuth2) + NetSuite (mock fixture)
- L3 scorers that read from `business_outcome_events` at scoring time; they stay synchronous and implement the Phase 57 `EvalScorer` contract.
- Per-company L3 KPI weighting: new top-level `companies:` block in `memroos.eval.yaml` with `{l3_sub_weights: {completion_rate, escalation_rate, ttr_p50, operator_approval_rate, cost_per_task}}`. Soft tenant key at Phase 61; Phase 62 reconciles `company_id` with authenticated `tenant_id`.
- `/business-ops` page in Kitchen UI: per-agent `W` timeline with L1/L2/L3 sparkline breakdown, click-through to source trace, and click-through to the originating business-system record URL (stored on `business_outcome_events.source_url`).

### Out of scope for Phase 61

- Six production adapters (SFDC v1, NetSuite v1 are deferred to v2; see scope clarification below)
- Phase 62 tenant isolation (API keys, multi-tenant table migration) — Phase 62
- Public SDK packaging
- OpenInference trace ingestion
- Auto-refreshing adapter webhooks (polling only at v1; webhook registration is a v2 concern)
</domain>

<decisions>
## Implementation Decisions

### Decision 1 — Two-stage adapter architecture (async pull → sync score)

The Phase 57 `EvalScorer.score()` interface is synchronous. External business systems (CRM, helpdesk, finance) are not. Forcing sync API calls inside the scorer would block scoring, add latency, and couple the eval engine to external service availability.

Resolution: two stages.

**Stage 1 (adapter pull):** An adapter job (`BusinessSystemAdapter.pull(correlationIds: string[])`) is invoked by a scheduled poll (default: every 5 minutes, configurable in `memroos.eval.yaml` under `business_ops.poll_interval_seconds`) or by an inbound webhook. It writes zero or more `BusinessOutcomeEvent` rows to the `business_outcome_events` table, keyed by `correlation_id` and `source` (crm/helpdesk/finance). These rows are authoritative business-signal records.

**Stage 2 (scorer read):** L3 scorers read from `business_outcome_events` at scoring time synchronously. If no rows exist yet for a `correlation_id`, L3 scores are computed as `null` / not-yet-observed and excluded from composite `W` until events arrive. This prevents premature L3 penalty for in-flight tasks.

Adapter file layout: `apps/kitchen/src/lib/business-ops/adapters/{hubspot,salesforce,intercom,zendesk,quickbooks,netsuite}.ts`. Each implements the `BusinessSystemAdapter` interface exported from `apps/kitchen/src/lib/business-ops/adapter-interface.ts`.

### Decision 2 — Correlation ID strategy

Phase 36 (ORCH-05) ships end-to-end `correlation_id` attached at task ingress and carried through all hops (Kitchen → LangGraph → agents). The `eval_runs` table's `trace_id` field is the correlation ID surface already present in Phase 57 — traces submitted to the eval engine carry the same `trace_id` that originated in orchestration.

Phase 61 adapters key `business_outcome_events` on `correlation_id = eval_runs.trace_id`. No new correlation scheme is introduced. Adapters store the `correlation_id` as a field they receive in the external-system payload (e.g. Intercom conversation metadata, HubSpot deal property) — operators must configure the external-system field name that carries the Kitchen `correlation_id`. This is a documented setup requirement, not an automated linkage.

Configuration surface in `memroos.eval.yaml`:
```yaml
business_ops:
  poll_interval_seconds: 300
  correlation_id_field: "kitchen_correlation_id"   # external system field name
```

### Decision 3 — Per-company L3 weights as a new top-level `companies:` block

The existing `memroos.eval.yaml` has `agents:` for per-agent overrides. L3-05 needs per-company weighting of the five L3 sub-metrics. A new top-level `companies:` block is added:

```yaml
companies:
  acme_corp:
    l3_sub_weights:
      completion_rate:       0.4
      escalation_rate:       0.2
      ttr_p50:               0.2
      operator_approval_rate: 0.1
      cost_per_task:         0.1
```

Sub-weights must sum to 1.0; the config reader validates and errors on load if not. The company key is a soft tenant identifier at Phase 61 — traces carrying a `company_id` metadata field are matched against this block when computing L3. Phase 62 formalizes this as an authenticated `tenant_id`. Both CONTEXTs note this coupling.

### Decision 4 — Realistic v1 adapter scope

The Roadmap lists "Salesforce + HubSpot v1", "Zendesk + Intercom v1", "QuickBooks + NetSuite v1". Shipping six production API integrations in one phase is not realistic. Phase 61 ships:
- **Live integrations (one per category):** HubSpot (simpler OAuth than Salesforce), Intercom (bearer-token simpler than Zendesk OAuth), QuickBooks (OAuth2 well-documented)
- **Mock fixtures (returning static `BusinessOutcomeEvent[]`):** Salesforce, Zendesk, NetSuite — each has a `{adapterName}-fixture.ts` that returns representative data so E2E tests pass without external credentials

The mock fixtures are explicitly marked `@fixture` in code and excluded from production adapter discovery. A Risk Note in the PLAN documents this scope trim and calls out that the v2 adapters (SFDC, Zendesk, NetSuite live) are deferred.

### Decision 5 — `business_outcome_events` introduces `tenant_id` from Phase 61

To avoid a painful Phase 62 migration, `business_outcome_events` ships with `tenant_id TEXT NOT NULL DEFAULT 'default-tenant'`. This is the same additive-column-with-default pattern used throughout v2.5 tables. When Phase 62 creates the `tenants` table, it will backfill real tenant IDs. All other existing tables (`eval_runs`, `seal_proposals`, etc.) get `tenant_id` in Phase 62 as a separate additive migration — Phase 61 only adds it to the new table it creates.

### Decision 6 — `/business-ops` is a new top-level page, not a sub-panel of `/evals`

L3 outcome data is an operational reporting surface for business owners, not a config-editing surface for eval engineers. Co-locating with `/evals` would conflate the audiences. `/business-ops` gets its own sidebar entry alongside Evals and SEAL. The page has two panels: a per-agent W timeline chart (with L1/L2/L3 sparklines, configurable date range) and an event feed showing recent `business_outcome_events` rows with their source, `correlation_id`, and link to the originating trace and external record.

### Decision 7 — L3 scorer null handling

When `business_outcome_events` has no rows for a `correlation_id` (task still in-flight, adapter not yet pulled), L3 sub-scorers return `null`. The composite `W` engine in Phase 57 must handle null L3 gracefully. Mitigation: add an explicit null-L3 path in `apps/kitchen/src/lib/evals/engine.ts`: if all L3 scorers return null, L3 contribution is excluded and `W` is recomputed over the available layers with normalized weights. This is additive to Phase 57's engine and is tested separately.
</decisions>

<code_context>
## Existing Code Insights

- `apps/kitchen/src/lib/db-schema.ts` owns additive SQLite schema initialization. `initSchema` is CRITICAL (reached by all DB-backed routes). Phase 61 adds one new table: `business_outcome_events`. Run `gitnexus_impact({target: "initSchema", direction: "upstream"})` before editing.
- `apps/kitchen/src/lib/evals/types.ts` defines `AgentEvalTrace` (with `outcome` field) and `EvalScorer` interface. L3 scorers implement `EvalScorer`. The `outcome` field on `AgentEvalTrace` already carries `completed`, `escalated`, `ttrMs`, `operatorApproved`, `costUsd` — these map directly to the canonical KPI set.
- `apps/kitchen/src/lib/evals/engine.ts` computes composite `W` — Phase 61 adds null-L3 handling as an additive path here.
- `apps/kitchen/src/lib/evals/scorers.ts` is where existing L1/L2 scorers live. L3 scorers are added in Phase 61 as a new file: `apps/kitchen/src/lib/business-ops/l3-scorers.ts`.
- `apps/kitchen/src/lib/evals/config.ts` parses `memroos.eval.yaml`. Phase 61 extends it to parse the new `companies:` and `business_ops:` top-level blocks.
- `apps/kitchen/src/lib/api-client.ts` is the centralized TanStack Query client. Phase 61 adds `useBusinessOpsTimeline()` and `useBusinessOutcomeEvents()` hooks.
- API route convention: `Response.json(...)` + `export const dynamic = "force-dynamic"`.
- `apps/kitchen/src/components/layout/sidebar.tsx` owns navigation entries — Phase 61 adds a Business Ops entry.
- Golden sets live at `golden-sets/` in the repo root (not under `apps/kitchen/`). The Phase 57 config reader resolves paths relative to the repo root.
- `eval_runs.trace_id` is the correlation ID that Phase 61 adapters key off of. No new correlation scheme required.
</code_context>

<specifics>
## Specific Ideas

### New library modules

`apps/kitchen/src/lib/business-ops/`
- `adapter-interface.ts` — `BusinessSystemAdapter` interface (`pull`, `name`, `category`), `BusinessOutcomeEvent` type, `BusinessOutcomeCategory` enum (`crm` / `helpdesk` / `finance`)
- `event-store.ts` — `writeOutcomeEvents(events: BusinessOutcomeEvent[]): void`, `getEventsForCorrelationId(correlationId: string): BusinessOutcomeEvent[]`, `getEventsForAgent(agentId: string, since?: string): BusinessOutcomeEvent[]`
- `extractor.ts` — `extractKpis(trace: AgentEvalTrace, events: BusinessOutcomeEvent[]): CanonicalKpiSet` where `CanonicalKpiSet = { completionRate, escalationRate, ttrP50Ms, operatorApprovalRate, costUsd }`
- `l3-scorers.ts` — five L3 scorers implementing `EvalScorer`: `completion_rate`, `escalation_rate`, `ttr_p50`, `operator_approval_rate`, `cost_per_task`. Each reads from `event-store.ts`. Returns `null` when no events available.
- `adapter-runner.ts` — `runAdapterPoll(correlationIds: string[], adapters: BusinessSystemAdapter[]): Promise<void>` — iterates registered adapters, calls `pull()`, writes events
- `adapters/hubspot.ts` — live HubSpot CRM adapter; pulls deal-advance and lead-disposition signals
- `adapters/salesforce.ts` — Salesforce mock fixture (marked `@fixture`)
- `adapters/intercom.ts` — live Intercom helpdesk adapter; pulls resolution, CSAT, escalation
- `adapters/zendesk.ts` — Zendesk mock fixture (marked `@fixture`)
- `adapters/quickbooks.ts` — live QuickBooks finance adapter; pulls transaction-posted, reconciled
- `adapters/netsuite.ts` — NetSuite mock fixture (marked `@fixture`)

### Schema addition in `apps/kitchen/src/lib/db-schema.ts`

```sql
-- business_outcome_events: Phase 61 adapter pull sink
CREATE TABLE IF NOT EXISTS business_outcome_events (
  id              INTEGER PRIMARY KEY,
  correlation_id  TEXT    NOT NULL,
  agent_id        TEXT,
  company_id      TEXT,
  tenant_id       TEXT    NOT NULL DEFAULT 'default-tenant',
  source          TEXT    NOT NULL CHECK(source IN ('crm','helpdesk','finance')),
  adapter         TEXT    NOT NULL,
  event_type      TEXT    NOT NULL,
  payload_json    TEXT    NOT NULL,
  source_url      TEXT,
  observed_at     TEXT    NOT NULL,
  created_at      TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS boe_correlation ON business_outcome_events(correlation_id);
CREATE INDEX IF NOT EXISTS boe_agent       ON business_outcome_events(agent_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS boe_tenant      ON business_outcome_events(tenant_id, observed_at DESC);
```

### Config surface additions to `memroos.eval.yaml`

```yaml
business_ops:
  poll_interval_seconds: 300
  correlation_id_field: "kitchen_correlation_id"

companies:
  default:
    l3_sub_weights:
      completion_rate:        0.35
      escalation_rate:        0.25
      ttr_p50:                0.20
      operator_approval_rate: 0.10
      cost_per_task:          0.10
```

### API routes

- `apps/kitchen/src/app/api/business-ops/timeline/route.ts` — GET: per-agent W timeline with L1/L2/L3 breakdown, date-range params
- `apps/kitchen/src/app/api/business-ops/events/route.ts` — GET: list `business_outcome_events` (filter: agent_id, correlation_id, source, since); POST: trigger an adapter poll for a list of correlation IDs
- `apps/kitchen/src/app/api/business-ops/kpis/[correlationId]/route.ts` — GET: computed `CanonicalKpiSet` for a specific correlation ID

### UI

- `apps/kitchen/src/app/business-ops/page.tsx` — `/business-ops` page with two panels
- `apps/kitchen/src/components/business-ops/WTimeline.tsx` — per-agent W timeline: sparkline chart (recharts, consistent with existing UI) with toggle for L1/L2/L3 layer breakdown; click-through to `/evals` run detail
- `apps/kitchen/src/components/business-ops/OutcomeEventFeed.tsx` — table of recent `business_outcome_events` rows: adapter badge, event type, correlation_id (links to trace), source_url (external link), observed_at
- Add Business Ops navigation entry to `apps/kitchen/src/components/layout/sidebar.tsx`
- Add TanStack Query hooks `useBusinessOpsTimeline(agentId, dateRange)`, `useBusinessOutcomeEvents(filter)`, `useKpisForCorrelation(correlationId)` to `apps/kitchen/src/lib/api-client.ts`

### Tests

- `extractor.ts`: KPI extraction from trace.outcome fields produces expected canonical KPI set
- L3 scorer null path: when no events exist for a correlation_id, scorer returns null
- L3 scorer happy path: given a `BusinessOutcomeEvent[]`, scorer returns expected normalized score
- Engine null-L3 path: composite W computed correctly when L3 is null (weights renormalized over L1+L2)
- HubSpot adapter (unit, against fixture responses): pull returns expected `BusinessOutcomeEvent[]`
- Intercom adapter (unit, against fixture responses)
- QuickBooks adapter (unit, against fixture responses)
- Adapter runner: calls all registered adapters, writes events, no duplicate insertion
- API routes: GET /business-ops/timeline returns correct shape; POST /business-ops/events triggers poll
- Config reader: `companies:` block parses and validates sub-weight sum = 1.0; error on invalid
</specifics>

<deferred>
## Deferred Ideas

- Live Salesforce, Zendesk, NetSuite integrations (v2 adapters — full OAuth/SOAP setup deferred)
- Inbound webhooks from business systems (v2; polling only at v1)
- Per-company golden sets derived from business-system data
- Automated correlation ID injection into external systems (v2 — operators must configure manually at v1)
- Multi-tenant API key scoping of `business_outcome_events` (Phase 62 adds authenticated tenant isolation)
- Dashboard alerting / notification when W drops below a threshold for a company
- SLA / TTR goal configuration per company (currently just observed signal, not compared to target)
- Phase 62 `tenant_id` backfill migration for pre-existing tables (`eval_runs`, `seal_proposals`, etc.)
</deferred>
