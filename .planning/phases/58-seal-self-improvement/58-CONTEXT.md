# Phase 58: SEAL Self-Improvement Substrate — Context

**Gathered:** 2026-05-15
**Status:** Ready for planning
**Mode:** Autonomous `/gsd-autonomous --only 58`

<domain>
## Phase Boundary

Phase 58 ships the generic self-improvement loop: reflection on a low-W trace → typed proposals sourced from a closed registry → operator approval queue → isolated apply → rerun-evals → keep-if-W-improved → rollback and audit if not. The loop is polymorphic over mutation surface — Phase 58 ships the substrate with a stub proposal type; Phases 59 and 60 populate the registry with real mutation surfaces (memory and agent instruction types respectively).

In scope for Phase 58:
- Reflection step: given a trace + W breakdown, produce one or more typed proposals from registered types, each with a forecast W-delta and rationale
- Closed proposal-type registry (TypeScript const object, not runtime plugin)
- Operator approval queue in Kitchen UI: diff view, forecast W-delta, approve/reject controls, persisted decisions
- Apply → rerun-evals → keep-if-W-improved cycle with isolated-context strategy
- Auto-rollback for regressed mutations; append-only audit log with full per-layer W deltas
- Baseline W snapshot persisted with proposal at creation time (required for deterministic keep/discard comparison)
- v2+ extension path documented

Out of scope for Phase 58:
- Memory-specific proposal types (`memory_rewrite`, `query_hint`, `salience_update`, `tier_route`, `eval_case_addition`) — Phase 59
- Agent instruction/skill/tool-routing proposal types — Phase 60
- Trajectory evals and per-role golden-set expansion — Phase 60
- Provider-backed judge invocation beyond Phase 57's local deterministic adapter — Phase 57 concern
- Public HTTP surface and SDK packaging — Phase 62
</domain>

<decisions>
## Implementation Decisions

1. **Isolated apply strategy — transaction-wrapped shadow copy with rollback guard.** When a proposal is applied, Phase 58 writes the mutation to a shadow representation (an in-memory or SQLite-transaction-wrapped copy), reruns evals against it, and commits to the real resource only if W_post >= W_baseline. If the eval run returns W_post < W_baseline or errors, the transaction is aborted (never committed), leaving the main resource unchanged. This avoids the complexity of snapshot/restore file operations and keeps rollback instantaneous for text-payload mutations (the only type at v1). File-system mutations (future `skill_addition` in Phase 60) will need the file-level snapshot strategy documented at that time. The shadow-copy approach is called out in Phase 59/60 handoff notes.

2. **Baseline W snapshot persisted at proposal creation time.** The `seal_proposals` table stores `baseline_w` (composite W of the originating eval run), `baseline_run_id` (FK to `eval_runs`), and `baseline_layer_json` (per-layer L1/L2/L3 breakdown). This makes the keep/discard comparison deterministic: any re-run of evals between proposal creation and apply cannot retroactively change the comparison target.

3. **Closed proposal-type registry as TypeScript const.** `apps/kitchen/src/lib/seal/proposal-registry.ts` exports a `PROPOSAL_TYPES` const object keyed by type string and a `ProposalType` union type derived from it. Adding a type requires editing this file and updating the registry — no dynamic registration at runtime. This is enforced by the TypeScript exhaustiveness check in the reflection and apply handlers. The v2+ extension path (runtime plugin model) is documented in the registry file as a `// v2+ extension path` comment block and cross-referenced from the Phase 58 SEAL substrate README.

4. **Audit log is append-only by service-layer convention.** `seal_audit_log` has no UPDATE or DELETE routes. The API surface exposes GET only for reads and a POST-only write path in the service. The existing `audit_log` table (SEC-02, v1.5) is a separate table for agent actions; `seal_audit_log` is a purpose-built SEAL table with richer W-delta columns. No merger with the existing table — the schemas are incompatible and the semantic scopes are different.

5. **Approval decisions are persisted independently of proposal state.** `seal_proposal_decisions` is a separate table (not a status column on `seal_proposals`) so the full approve/reject history is queryable even after a proposal is applied or rolled back. A proposal can transition: `pending → approved → applied` or `pending → approved → rolled_back` or `pending → rejected`. Each transition writes a row to `seal_proposal_decisions` and a row to `seal_audit_log`.

6. **`/seal` page in Kitchen UI.** Following the `/evals` precedent from Phase 57, the SEAL approval queue lives at `/seal`. The page has two panels: a pending proposals queue (ApprovalQueue component) and a read-only audit log panel. The sidebar navigation entry is added alongside the Evals entry.

7. **Reflection step calls Phase 57's eval engine service.** `reflection.ts` consumes `EvalService.getRunById()` (or equivalent Phase 57 interface) to fetch the W breakdown for a trace, then applies a threshold (configurable in `memroos.eval.yaml` under `seal.reflection_threshold`, default 0.6) to decide whether the trace qualifies for reflection. Proposals are only generated for traces where W < threshold.

8. **Stub proposal type `noop_test` ships at v1.** This satisfies the success criteria (end-to-end loop demonstrable) without requiring Phase 59 memory types. The stub proposal type generates a no-op diff, forecasts W-delta of 0, and validates that the full infrastructure round-trips. It is explicitly marked `@internal` in the registry and excluded from the UI's proposal type display filter.
</decisions>

<code_context>
## Existing Code Insights

- `apps/kitchen/src/lib/db-schema.ts` owns additive SQLite schema initialization. The `initSchema` function is CRITICAL — reached by all DB-backed routes. Phase 58 adds three tables: `seal_proposals`, `seal_proposal_decisions`, `seal_audit_log`.
- `apps/kitchen/src/lib/db.ts` exposes the shared initialized SQLite singleton. Phase 58 uses the same singleton.
- Phase 57 adds `apps/kitchen/src/lib/evals/` with scorer registry, composite W engine, and persistence. Phase 58 imports `EvalService` from this module to fetch baseline W and to rerun evals post-apply.
- `apps/kitchen/src/lib/api-client.ts` is the centralized client data access module with TanStack Query hooks. Phase 58 adds `useSealProposals()`, `useSealAuditLog()`, and mutation hooks for approve/reject.
- API route handlers use `Response.json(...)` and `export const dynamic = "force-dynamic"` — Phase 58 routes follow the same convention.
- `apps/kitchen/src/components/layout/sidebar.tsx` owns navigation entries — Phase 58 adds a Seal entry alongside Evals.
- Existing `audit_log` table (SEC-02) uses append-only semantics by convention. Phase 58 applies the same convention to `seal_audit_log` with an explicit service-layer guard.
- Phase 57's `eval_runs` table is the source of `baseline_run_id` FK. Phase 58 does not write to `eval_runs` — it reads from it.
</code_context>

<specifics>
## Specific Ideas

### Library modules under `apps/kitchen/src/lib/seal/`
- `proposal-registry.ts` — `PROPOSAL_TYPES` const, `ProposalType` union, registry entry shape, v2+ comment block
- `reflection.ts` — `reflectOnTrace(traceId, runId)` → `ProposalDraft[]`; reads W from eval engine, applies threshold, generates typed proposals with forecast W-delta and rationale
- `apply.ts` — `applyProposal(proposalId)` → shadow-copy apply, eval rerun, keep/rollback decision
- `audit.ts` — append-only `writeAuditEntry(...)` and `queryAuditLog(...)` helpers; no update/delete paths
- `service.ts` — `SealService` class orchestrating reflection → approval → apply → audit; consumes `EvalService` from Phase 57

### API routes
- `apps/kitchen/src/app/api/seal/proposals/route.ts` — GET (list with filter: pending/approved/rejected/applied/rolled_back) + POST (trigger reflection on a trace)
- `apps/kitchen/src/app/api/seal/proposals/[id]/route.ts` — GET (single proposal with diff and baseline W) + POST `{action: "approve"|"reject"|"apply"}`
- `apps/kitchen/src/app/api/seal/audit/route.ts` — GET only (append-only; no POST/PATCH/DELETE routes)

### UI
- `apps/kitchen/src/app/seal/page.tsx` — `/seal` page with two panels
- `apps/kitchen/src/components/seal/ApprovalQueue.tsx` — pending proposals list: proposal type badge, diff view (collapsible), forecast W-delta chip (green if positive, red if negative), approve/reject buttons; persists decision via TanStack mutation
- `apps/kitchen/src/components/seal/AuditLogPanel.tsx` — read-only immutable audit table with per-layer W deltas; filterable by proposal ID

### Schema additions in `apps/kitchen/src/lib/db-schema.ts` (additive only)
```
seal_proposals:
  id, trace_id, run_id (FK eval_runs), agent_id, proposal_type,
  status CHECK(pending|approved|rejected|applied|rolled_back),
  diff_json, rationale, forecast_w_delta, baseline_w, baseline_run_id,
  baseline_layer_json, created_at, updated_at

seal_proposal_decisions:
  id, proposal_id (FK seal_proposals), action CHECK(approved|rejected|applied|rolled_back),
  operator, reasoning, decided_at

seal_audit_log:
  id, proposal_id (FK seal_proposals), event CHECK(proposed|approved|rejected|apply_started|
  apply_succeeded|apply_failed|rolled_back), baseline_w, post_apply_w,
  delta_l1, delta_l2, delta_l3, delta_composite, detail_json, timestamp
```

### Config surface addition (`memroos.eval.yaml`)
```yaml
seal:
  reflection_threshold: 0.6    # W below this triggers reflection
  auto_apply: false            # v1: always require operator approval
  proposal_types: [noop_test]  # closed list; adding requires registry commit
```

### Tests
- Reflection generates a typed proposal for a trace with W < threshold
- Reflection generates no proposals for W >= threshold
- Registry exhaustiveness: unknown proposal type raises at compile/test time
- Shadow-copy apply: W_post >= baseline keeps; W_post < baseline rolls back
- Audit log: apply_succeeded and apply_failed both write entries; no update/delete path exposed
- API routes: GET /seal/proposals returns pending list; POST approve transitions status; GET /seal/audit returns entries
</specifics>

<deferred>
## Deferred Ideas

- Memory-specific proposal types — Phase 59
- Agent instruction / skill / tool-routing proposal types — Phase 60
- File-system snapshot/restore strategy for `skill_addition` mutations — Phase 60
- Auto-apply mode (`seal.auto_apply: true`) — Phase 59+ concern; v1 always requires operator approval
- Bulk proposal review (approve/reject all) — later UX iteration
- Proposal expiry and garbage collection policies
- Multi-tenant proposal isolation (needed when Phase 62 public API opens)
- Runtime plugin model for proposal types (v2+) — documented in `proposal-registry.ts` comment block; no implementation in Phase 58
</deferred>
