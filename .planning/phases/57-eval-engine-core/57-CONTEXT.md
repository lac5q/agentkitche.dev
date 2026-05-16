# Phase 57: Eval Engine Core - Context

**Gathered:** 2026-05-15
**Status:** Ready for planning
**Mode:** Autonomous `/gsd-autonomous --only 57`

<domain>
## Phase Boundary

Phase 57 ships the foundation for v2.5: a scorer registry, 3-layer composite `W`, pinned cross-family judge metadata, golden-set framework, drift guard, `memroos.eval.yaml` config surface mirrored in Kitchen, persistence for eval runs, and memory recall as a registered scorer.

Out of scope for Phase 57:
- SEAL proposal/apply/rollback loop (Phase 58)
- Memory mutation proposals and memory policy lab (Phase 59)
- Agent instruction/skill/tool-routing mutations (Phase 60)
- Real CRM/helpdesk/finance adapters (Phase 61)
- Public SDKs and external customer API packaging (Phase 62)
</domain>

<decisions>
## Implementation Decisions

1. Use a local deterministic judge adapter in Phase 57. It records the pinned judge model, prompt template version, prompt hash, model family, swap augmentation status, and rubric scores. Provider-backed calls remain a later adapter concern; the registry contract and persistence shape are what Phase 57 must lock.
2. Enforce cross-family at scoring time by comparing the trace agent model family with the judge model family. Same-family pairings fail before `W` is trusted.
3. Store `memroos.eval.yaml` at repo root. Because the app has no direct YAML dependency, implement a deliberately narrow config reader/writer for the locked config shape rather than introducing a new package.
4. Add additive SQLite tables in `initSchema` for eval runs and per-example results. GitNexus marks `initSchema` as CRITICAL because it is reached by all DB-backed routes, so schema work must stay additive and covered by tests.
5. Ship small seed golden sets now to prove the framework and config paths. Phase 60 owns expanding role-specific golden sets to approximately 50 examples each.
6. Add Kitchen UI as a focused operations page at `/evals` with config editing, drift status, latest run details, and run history. The page reads/writes the same `memroos.eval.yaml` as the engine.
7. Reframe the existing memory recall scoring code as a registered L1/L2 scorer through an adapter, without deleting the current memory eval harness.
</decisions>

<code_context>
## Existing Code Insights

- `apps/kitchen/src/lib/db-schema.ts` owns additive SQLite schema initialization.
- `apps/kitchen/src/lib/db.ts` exposes the shared initialized SQLite singleton.
- Existing memory recall eval logic lives in `apps/kitchen/src/lib/memory-recall-evals.ts`.
- API route handlers use `Response.json(...)` and `export const dynamic = "force-dynamic"`.
- Client data access is centralized in `apps/kitchen/src/lib/api-client.ts` with TanStack Query hooks.
- Dashboard pages use compact operational panels and existing sidebar navigation in `apps/kitchen/src/components/layout/sidebar.tsx`.
</code_context>

<specifics>
## Specific Ideas

- Create `apps/kitchen/src/lib/evals/` with config, registry, scorer, judge, persistence, and service modules.
- Add `/api/evals/config`, `/api/evals/run`, and `/api/evals/history`.
- Add `/evals` page and a reusable `EvalEnginePanel` component.
- Seed `golden-sets/business-ops-50.jsonl`, `sales-50.jsonl`, `support-50.jsonl`, `finance-50.jsonl`, and `ops-50.jsonl` with representative v1 examples.
- Add targeted tests for engine behavior and API route behavior.
</specifics>

<deferred>
## Deferred Ideas

- Provider-backed judge invocation and judge-model re-baselining workflow.
- Full 50-example role golden sets.
- External OpenInference trace ingestion.
- Public SDK ergonomics.
- L3 business-system adapters beyond placeholder outcome scorers.
</deferred>
