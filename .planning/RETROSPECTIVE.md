# Retrospective: Memroos

---

## Milestone: v1.3 — Advanced Observability + Knowledge Depth

**Shipped:** 2026-04-15
**Phases:** 6 (12–17) | **Plans:** 8 | **Commits:** 46 | **+6,553 lines** | **2 days**

### What Was Built

- Projects/ mem0 ingestion with triple-dedup (Phase 12)
- Skill coverage gaps + failure rate on `/api/skills` (Phases 13–14)
- 30-day CSS grid heatmap with React.memo cells (Phase 15)
- Per-node activity panel with AbortController + keyword map (Phase 16)
- Collapsible group nodes with pure collapse-logic module (Phase 17)

### What Worked

- **TDD discipline held** — every phase started with RED tests, made them GREEN, then integrated. Zero regressions introduced.
- **Pure modules** — `collapse-logic.ts` and `node-keyword-map.ts` as side-effect-free modules made testing fast and refactoring safe.
- **Two-wave approach for Phase 17** — splitting parentId migration (wave 1) from collapse toggle (wave 2) avoided a complex, hard-to-test single change.
- **Incremental API extension** — adding fields to `/api/skills` rather than new routes kept the frontend polling pattern simple.

### What Was Inefficient

- **ROADMAP/STATE not updated by worktree merges** — 6 phases were completed in worktrees but planning docs weren't updated on merge. Required manual reconciliation at milestone close. Cost: ~1 session of confusion.
- **`collections.config.json` missing `knowledge` collection** — went unnoticed until user spotted it in the UI. Should be caught by a Library smoke test.
- **gsd-tools one-liner extraction failed** — SUMMARY.md format didn't match expected `one_liner` field pattern; CLI extracted garbage. Accomplishments had to be reconstructed manually.

### Patterns Established

- Group children should always use `parentId` + `extent:'parent'` in React Flow — never absolute coordinates for grouped nodes.
- Triple-dedup pattern (content-hash + mtime watermark + origin tag) is the standard for any mem0 ingestion script.
- `AbortController` is mandatory in any `useEffect` that fetches — enforced in NodeDetailPanel, carry forward.

### Key Lessons

- **Worktree merges delete planning files** — always run `git diff main..HEAD --name-only | grep .planning` after merge to catch dropped docs.
- **`collections.config.json` is a manifest** — any new knowledge collection added to QMD must also be added here or the Library undercounts.
- **Skills features are in The Flow, not a sidebar** — users expect a dedicated `/skills` page; the Cookbooks node in canvas is not discoverable enough. Add to v1.4.

---

## Milestone: v1.4 — Cookbooks

**Shipped:** 2026-04-15
**Phases:** 1 (Phase 18) | **Plans:** 1

### What Was Built

- Dedicated `/cookbooks` sidebar page with gaps/health panel, 30-day heatmap, full 254-skill list
- Real model usage tracking in The Ledger — reads `~/.claude/projects/**/*.jsonl`, aggregates per model with dedup by `requestId`
- Fixed GitNexus API field names (meta.stats.nodes/edges/communities)

### What Worked

- **Reuse over rebuild** — SkillHeatmap component dropped in without modification; `/api/skills` extended with one new field rather than a new endpoint

### What Was Inefficient

- Phase 18 had no formal GSD artifacts (PLAN.md/SUMMARY.md) — shipped directly then retroactively documented at close

### Key Lessons

- Model mix data was always available in JSONL session logs — just needed a readline parser; no external telemetry required
- `qwen3.5-plus` appearing in Claude Code JSONL suggests some sessions route through non-Claude models

---

## Milestone: v1.5 — Agent Coordination + Voice

**Shipped:** 2026-04-20
**Phases:** 7 (19–25) | **Plans:** 15 | **55/55 requirements**

### What Was Built

- SQLite FTS5 conversation store (Phase 19) — better-sqlite3 with WAL mode, JSONL ingestion, recall/ingest/stats API
- Hive mind coordination (Phase 20) — cross-agent action log, task delegation with step recovery, HiveFeed polling component
- Paperclip fleet node (Phase 21) — collapsible group in Flow, fleet panel with autonomy modes, dispatch form
- Pipecat voice server (Phase 22) — Python service (port 7860), Gemini Live + cascade STT/TTS, SQLite transcript persistence
- Memory intelligence (Phase 23) — LLM consolidation engine, 4-tier salience decay, peer-awareness panel
- Security + audit (Phase 24) — 18-pattern content scanner, SQLite audit log, AuditLogPanel
- Usage analytics (Phase 25) — TimeSeriesChart on Ledger/Library/Cookbooks with day/week/month toggle

### What Worked

- **UI panels on Library (not Ledger)** — user confirmed panels live on Library page, not Ledger; saved a revert
- **Python voice server as separate process** — Pipecat on port 7860 with Next.js proxy keeps concerns cleanly separated
- **Pure presentational chart component** — TimeSeriesChart receives data as props, no hook calls inside
- **instrumentation.ts scheduler pattern** — consolidation and decay bootstrapped via Next.js server instrumentation

### What Was Inefficient

- **Verification checkboxes skipped** — REQUIREMENTS.md checkboxes never updated as phases shipped; required retroactive update at milestone close (34 checkboxes fixed)
- **VERIFICATION.md missing for 3 phases** — Phases 20, 22, 24 had no formal verification runs; relied on test pass counts instead
- **3 open human-gate checkpoints at close** — Phase 12 (live run), Phase 19 (UI panel), Phase 23 (UI panel) required browser verification at close time

### Patterns Established

- `better-sqlite3` singleton with WAL mode = standard for all local persistence (memories, audit log, recall log)
- Scheduler bootstrap via `instrumentation.ts` with `NEXT_RUNTIME === 'nodejs'` guard
- Fire-and-forget database writes (audit log, recall log) wrapped in try/catch — never block on non-critical side effects
- TimeSeriesChart as pure presentational component powered by `useTimeSeries` hook

### Key Lessons

- **UI panel location must be confirmed before implementation** — Phase 19 originally planned for Ledger, ended up on Library; user confirmed correct location at close
- **Human checkpoints need explicit tracking** — "Plan 03 Task 3 is checkpoint:human-verify" was noted but not acted on until milestone close audit
- **Pre-close audit catches traceability gaps** — running `/gsd:audit-milestone` before close would have caught unchecked requirements earlier

---

## Milestone: v1.7 — Progressive Tool Gateway Runtime

**Shipped:** 2026-05-04
**Phases:** 5 (29–33) | **Plans:** 9 | **~21,800 LOC total** | **4 days (May 1–4)**

### What Was Built

- Top-level gateway MCP tools (Phase 29) — `tool_catalog`, `tool_discover`, `tool_load`, `tool_record_outcome`, `tool_stats` callable directly from any MCP client
- Outcome-aware selection (Phase 30) — success/failure scoring by capability, contextSignals aggregated from outcome metadata
- Memroos Gateway Ops UI (Phase 31/32-04) — outcome score badges, SimilarTaskPanel, collapsible context filter form on Cookbooks page
- Python contextMatchSignal ported to TypeScript (Phase 32) — exact multipliers (task_type×2, repo×2, agent_id×1, tags×1); task field never read; `GET /api/tool-attention/similar` route + `useSimilarTaskRecommendations` hook
- Gateway hardening (Phase 33) — lint exits 0, pytest coverage 11→18 tests, `tool_discover` category field + categories summary dict

### What Worked

- **Remote CCR agent at 3:30 AM** — autonomous execution of Phases 32 + 33 while user slept; returned all 5 plans with summaries, tests, and commits
- **Wave-based TDD (Wave 0 stubs first)** — contextMatchSignal stubs written before any production code; caught field naming inconsistency (`successCount` vs `successes`) before it reached tests
- **Algorithm port documentation in plan** — exact multipliers + privacy constraint stated in PLAN.md before implementation; plan checker caught missing `*2` multipliers in code block

### What Was Inefficient

- **Phase 31 absorbed into Phase 32** — originally scoped as standalone phase; remote agent folded it into Wave 3 without creating Phase 31 directory; required retroactive backfill at close
- **Branch proliferation** — 3 feature branches created during the milestone needed manual merge/cherry-pick; some work duplicated across branches due to concurrent execution
- **gsd-tools parser failure** — `roadmap analyze` returned empty throughout the session; all routing had to be done by reading files directly

### Patterns Established

- Remote CCR agent prompt must be fully self-contained (skills live on local machine, not in remote env)
- Phase plan checker pass requires: field names consistent between interface + behaviors + test stubs; open questions marked RESOLVED
- Wave-0 test stubs before Wave-1 production code = effective discipline for multi-wave implementations

### Key Lessons

- **Create phase directory before agent runs** — had Phase 31 directory existed, remote agent would have produced artifacts in the right place
- **gsd-tools `roadmap analyze` is unreliable on this ROADMAP.md format** — always have fallback to `grep -E "^\-"` on ROADMAP.md directly
- **Pre-close REQUIREMENTS.md audit** — UIGW-01/02/03 were still marked Pending at close even though Phase 31 delivered them; update requirements as phases ship, not at close

---

## Milestone: v2.5 — Eval Engine + Self-Improvement Platform

**Shipped:** 2026-05-17
**Phases:** 6 (57-62) | **Plans:** 7

### What Was Built

- Eval engine core with scorer registry, 3-layer composite `W`, pinned judge, drift guard, persistence, config, and UI surface
- SEAL self-improvement substrate with typed proposals, operator approval, shadow apply, keep/rollback, audit trail, and deterministic modeled post-apply W re-scoring
- Memory autogen proposal family plus fixed-harness policy lab
- Agent autogen proposal family, trajectory scorer, named weight presets, and minimal viable per-role golden sets
- Business-ops L3 outcome layer with event store, scorer/poller, CRM/helpdesk/finance adapters, and dashboard surface
- Public eval API plus TypeScript/Python SDKs with tenant isolation

### What Worked

- **Reconciliation-first closeout** — artifact analysis found the real missing item: `58-02-SUMMARY.md`, not more implementation.
- **Honesty guardrail held** — Tier 1 W-lift is explicitly modeled and deterministic; behavioral instruction/skill lift was deferred instead of overclaimed.
- **Minimal viable golden sets were enough to exercise drift guard** — positive and policy-leak negative examples made the 0.85 agreement floor meaningful.
- **Full verification recovered confidence** — targeted SEAL tests, full Memroos Vitest, and production build all passed before archival.

### What Was Inefficient

- **Planning docs drifted badly mid-milestone** — STATE.md previously claimed completion while multiple summaries and requirement checkboxes were missing.
- **Phase 59 was retro-documented** — implementation existed before a phase contract, forcing summary/plan reconstruction after the fact.
- **GSD milestone automation needed human cleanup** — SDK archive output was structurally useful but still required manual accomplishments, roadmap collapse, and state/project evolution.

### Patterns Established

- Summary parity is the canonical GSD completion signal: every PLAN.md must have a matching SUMMARY.md before advancing.
- Modeled eval deltas must carry explicit metadata (`wLiftModeled`) so operators can distinguish fixed-harness evidence from empirical re-execution.
- v3 planning should treat auth, immutable audit, compliance posture, and context-source reliability as product-owned platform layers, not cleanup chores.

### Key Lessons

- Run `gsd-sdk query roadmap.analyze` before trusting STATE.md; the artifact graph was more reliable than prose status.
- Milestone close should include `audit-open` and record deferred context questions rather than burying them.
- Complete milestone archival is safest as a two-part operation: archive and verify docs first, then commit/tag only after the whole worktree is clean.

---

## Cross-Milestone Trends

| Milestone | Phases | Plans | Days | LOC Added | Key Theme |
|-----------|--------|-------|------|-----------|-----------|
| v1.1 | 5 | 12 | 3 | ~3,000 | Knowledge architecture foundations |
| v1.2 | 6 | 8 | 2 | ~4,500 | Live data + sync pipelines |
| v1.3 | 6 | 8 | 2 | +6,553 | Observability depth + canvas UX |
| v1.4 | 1 | 1 | 1 | ~500 | Cookbooks page + model usage tracking |
| v1.5 | 7 | 15 | 4 | ~8,000 | Agent coordination + voice |
| v1.7 | 5 | 9 | 4 | ~5,000 | Tool gateway runtime + Python→TS algorithm port |
| v2.5 | 6 | 7 | 2 | n/a | Eval engine + self-improvement substrate |
