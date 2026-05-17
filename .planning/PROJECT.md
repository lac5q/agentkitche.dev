# Project: Memroos

*Last updated: 2026-05-17 — v3.1 shipped; v4.0 Orchestration Depth + Intelligence Uplift starting*

---

## Current Product Goal

`memroos.dev` is the control plane where AI-native teams retain what agents learn, retrieve the right context at runtime, dispatch work to the right agent, and turn repeated work into reusable skills.

See `.planning/GOAL.md` for the full development goal and workflow loop.

---

## Current Milestone: v4.0 Orchestration Depth + Intelligence Uplift

**Goal:** Deepen the orchestration runtime with smarter HIL semantics, multi-hop resilience, and LLM-powered recall; add voice meeting participation and memory/recall pluggability; close the behavioral W-lift gap in SEAL.

**Target features:**
- HIL edit-and-continue — modify task state mid-graph before resuming
- HIL timeout + escalation policies — SLA-driven auto-escalation
- Multi-hop retry + rollback compensation — durable failure recovery across multi-agent chains
- Memory backend pluggability — swap/add backends beyond mem0 + Qdrant + Neo4j
- Voice meeting bot — Pipecat as active meeting participant
- Flow trigger button — `qmd update` from the UI
- Library freshness indicator — QMD index recency vs file mtime in UI
- LLM-powered recall scoring — embedding-based upgrade over BM25
- Cross-project recall — similar-task recommendations across repos
- True behavioral W-lift — SEAL instruction/skill proposals with real agent re-execution eval

---

## Previous Milestone: v3.1 Context Reliability + Runtime Resilience — SHIPPED 2026-05-17

**What shipped:** Phase 69 — declarative context source contracts, context health UI/API, stale-source safe-answer gates, generated runtime service installers (LaunchAgent), degradation eval/UAT coverage. 8 critical security findings fixed (HttpOnly cookies, missing auth guards on 5 routes, TOCTOU race in first-user bootstrap, x-forwarded-host spoofing). 680 tests passing.

---

## Previous Milestone: v3.0 Compliance Platform + Finance Vertical — SHIPPED 2026-05-17

**What shipped:** Phases 63-69 — Rename+Team Auth (RBAC, JWT, invite system), Immutable Audit+HIL Escalation, Finance Reconciliation, Self-hosted Hardening+Docker, CoVe Integration, Security Boundary Hardening, Context Source Contracts.

---

## Previous Milestone: v2.5 Eval Engine + Self-Improvement Platform — SHIPPED 2026-05-17

**What shipped:** Composite W, SEAL substrate, memory/agent autogen proposal families, L3 outcome adapters, public eval API + SDK. Tier 1 modeled W-lift shipped; true behavioral W-lift deferred to v4.0.

---

## Previous Milestone: v2.0 A2A Hub — Open Source — SHIPPED 2026-05-11

**What shipped:** A2A hub (`/.well-known/agent.json`, A2A v1 task API, ADK integration), universal REST API + canonical agent registry, LangGraph orchestration (Python, SqliteSaver, HIL), unified memory across vector (Qdrant Cloud) + graph (Neo4j via mem0) + episodic (SQLite), operating profiles (local-dev/single-host/private-network/cloud-https/custom), Docker full-stack, developer setup experience, documentation rewrite, OSS polish (MIT, CONTRIBUTING, SECURITY, CI). Phases 34-41.

---

## Previous Milestone: v1.7 Progressive Tool Gateway Runtime — SHIPPED 2026-05-04

**What shipped:** Top-level MCP gateway tools, outcome-aware tool selection, Python contextMatchSignal algorithm ported to TypeScript, SimilarTaskPanel UI, outcome score badges, gateway hardening (lint + pytest coverage).

---

## Previous State: v1.6 Shipped

v1.6 complete — 3 phases (26-28), 3 plans, monorepo migration shipped, progressive MCP tool attention live, production deployment verified, monorepo CI added.

---

## Previous State: v1.5 Shipped

v1.5 complete — 7 phases (19-25), 15 plans, 55/55 requirements satisfied. Shared SQLite backbone, cross-agent hive mind coordination, Paperclip fleet node, Pipecat voice server, LLM consolidation engine, 4-tier salience decay, security scanner + audit log, usage analytics dashboard.

---

## What This Is

An open-source A2A protocol hub and agent operations dashboard. Memroos speaks Google's Agent-to-Agent (A2A) protocol natively — any A2A-compatible agent (Google ADK, Claude Code, LangChain, CrewAI, AutoGen) plugs in automatically; non-A2A agents get a thin REST shim. It ships with a unified three-tier memory architecture (vector via Qdrant Cloud, graph via Neo4j, episodic via SQLite) and a Next.js dashboard that makes every agent, knowledge system, and skill visible, connected, and self-improving.

Memroos should operate like a product with a recommended install path, not a personal repo full of hidden assumptions. The default profile should be excellent for local development, while `single-host`, `private-network`, `cloud-https`, and `custom` profiles let operators adapt ports, paths, service URLs, public base URLs, auth mode, and machine layout without changing source.

## Core Value

Any agent framework plugs into Memroos — and every agent, knowledge system, and skill becomes visible, connected, and self-improving.

---

## Requirements

### Validated

- ✓ Canonical monorepo layout with Memroos in `apps/memroos` and services in `services/` — v1.6 (MONO-01/02)
- ✓ Root script delegation and root-aware runtime paths — v1.6 (MONO-03/04/05)
- ✓ Memory and Knowledge MCP configured from root `.mcp.json` — v1.6 (MCP-01/02)
- ✓ Progressive Knowledge MCP workspace surface — v1.6 (MCP-03)
- ✓ Tool Attention catalog/discover/load/outcome/stats actions — v1.6 (TOOL-01/02)
- ✓ Tool Attention API, Cookbooks panel, Flow node, and node detail stats — v1.6 (UI-01/02/03/04)
- ✓ Monorepo production build, LaunchAgent deploy, and CI hardening — v1.6 (OPS-01/02/03)
- ✓ Top-level progressive tool gateway MCP tools (`tool_catalog`, `tool_discover`, `tool_load`, `tool_record_outcome`, `tool_stats`) — v1.7 (TOOLGW-01/02)
- ✓ Outcome-aware Tool Attention stats and discovery ranking — v1.7 (MEMGW-01/02)
- ✓ Similar-task memory recommendations via contextMatchSignal (Python→TypeScript port) — v1.7 (MEMGW-03)
- ✓ Memroos Tool Gateway ops UI: SimilarTaskPanel, outcome score badges, context filters — v1.7 (UIGW-01/02/03)
- ✓ tool_discover category field + pytest coverage 11→18 tests + lint enforced in CI — v1.7 (TOOLGW-03/OPSGW-01/02/03)
- ✓ Knowledge base collections browsable with doc counts and freshness — v1.1
- ✓ Live agent heartbeat visible in Flow diagram — v1.2
- ✓ Bidirectional Obsidian ↔ mem0 knowledge sync — v1.2
- ✓ Skill management dashboard surfaced in Flow — v1.2
- ✓ Gwen self-improving loop (skill pruning + curation) — v1.2
- ✓ Projects/ subdirectory ingested to mem0 nightly — v1.3 (KNOW-08/09)
- ✓ Skill coverage gaps (30-day-dark skills) visible — v1.3 (SKILL-07)
- ✓ Skill failure rate by agent/error-type — v1.3 (SKILL-06)
- ✓ 30-day skill heatmap in NodeDetailPanel — v1.3 (SKILL-08)
- ✓ Per-node activity panel (last 10 events, AbortController) — v1.3 (FLOW-13)
- ✓ Collapsible agent group nodes in Flow — v1.3 (FLOW-12)
- ✓ Dedicated Cookbooks page in sidebar navigation — v1.4 (COOK-01)
- ✓ Skill gaps/health panel on Cookbooks page — v1.4 (COOK-02)
- ✓ 30-day heatmap on Cookbooks page — v1.4 (COOK-03)
- ✓ Full skills list on Cookbooks page — v1.4 (COOK-04)
- ✓ SQLite FTS5 conversation store with recall/ingest/stats API — v1.5 (SQLDB-01/02/03)
- ✓ SqliteHealthPanel on Library page — v1.5 (SQLDB-04, DASH-01)
- ✓ Hive mind coordination (action log + task delegation + recovery) — v1.5 (HIVE-01/02/03)
- ✓ HiveFeed live polling component on Memroos Floor — v1.5 (HIVE-04, DASH-02)
- ✓ Paperclip fleet node in Flow + fleet panel — v1.5 (PAPER-01/02/03/04, HIVE-05)
- ✓ Pipecat voice server (Gemini Live + STT/TTS cascade) — v1.5 (VOICE-01/02/03)
- ✓ Voice transcripts written to SQLite — v1.5 (VOICE-04)
- ✓ VoicePanel on Flow page with scrollable transcript — v1.5 (VOICE-05, DASH-04)
- ✓ Memory consolidation engine + LLM pattern extraction — v1.5 (MEM-01)
- ✓ 4-tier salience decay with access-resistance — v1.5 (MEM-02)
- ✓ MemoryIntelligencePanel on Library page — v1.5 (MEM-03)
- ✓ AgentPeersPanel on Memroos Floor + /api/agent-peers — v1.5 (MEM-04)
- ✓ 18-pattern content scanner with severity blocking — v1.5 (SEC-01)
- ✓ SQLite audit_log table + AuditLogPanel — v1.5 (SEC-02/03, DASH-03)
- ✓ Usage analytics (6 metrics, 3 windows) on Ledger/Library/Cookbooks — v1.5 (ANA-01/02/03/04)

### Active (v4.0)

- [ ] HIL edit-and-continue — operator edits task payload fields mid-graph before resume (HIL-01..03)
- [ ] HIL timeout + escalation policies — SLA countdown, auto-escalate on timeout (HIL-04..06)
- [ ] Multi-hop retry compensation and rollback — per-hop retry budget, coordinated rollback (ORCH-08..10)
- [ ] Memory backend pluggability — adapter interface for swapping vector/graph/episodic backends (MEM-06..08)
- [ ] Voice meeting bot — Pipecat meeting participant, real-time transcript, Memroos highlights panel (VOICE-06..08)
- [ ] Flow trigger button — `qmd update` pipeline kickoff from UI (UI-05)
- [ ] Library freshness indicator — QMD index recency vs file mtime display (UI-06)
- [ ] LLM-powered recall scoring — embedding-based semantic ranking upgrade (RECALL-01..02)
- [ ] Cross-project recall — similar-task recommendations across multiple local repos (RECALL-03..04)
- [ ] True behavioral W-lift — SEAL instruction/skill proposals with real agent re-execution + eval (SEAL-04..06)

### Recent Milestones

- [x] **v2.5 Eval Engine + Self-Improvement Platform (Phases 57-62)** — Composite W, SEAL substrate, memory/agent autogen proposal families, L3 outcome layer, public eval API + SDK; Tier 1 modeled W-lift shipped, behavioral W-lift deferred to v3.
- [x] **v2.1 Security + Trust Layer (Phases 42-45)** — Agent Shield + Iris pre-flight foundation, tool permission guard, security operations UI, and progressive capability exposure
- [x] **v2.2 LLM Optimization + Evaluation (Phases 46-49)** — Model-routing telemetry, recommendation API, eval rigs, quality scoring, optimization dashboard and reports
- [x] **v2.3 Agent Runtime Enhancements (Phases 50-52)** — Agent-side middleware, memory client v2, local observability dashboard
- [x] **v2.4 Performance + Caching (Phases 53-54)** — Response caching, query performance, cold-start elimination, regression budgets

### Deferred (v5.0+ candidates)

- [ ] ClaudeClaw-inspired Chat tab — dedicated command/chat workspace for CLIs, Paperclip project agents, runtime subagents, and Memroos system identities, separate from Flow
- [ ] Memory search surface — unified search across SQLite recall, mem0/vector memory, Neo4j graph memory, and knowledge files with filters for agent, project, source, date, and tier
- [ ] Schedules and routines console — visible recurring jobs, cron health, standing delegations, maintenance routines, and approval-required automations
- [ ] Hivemind Obsidian view — graph/canvas exploration of agents, memories, tasks, proposals, skills, backlinks, and relationships inspired by Obsidian/ClaudeClaw
- [ ] Paperclip design-system completion — migrate drawers, sheets, modals, detail panels, empty states, and error states off the older dark dashboard shell
- [ ] Flow canvas redesign — migrate React Flow topology, minimap, controls, node cards, edge styling, group boxes, and node detail panels into the new Paperclip-style visual system while preserving graph readability

### Out of Scope

- Mobile app — web-first, desktop dashboard
- Multi-user auth — single-user local tool (for now; OSS users run their own instance)
- GitNexus embeddings — blocked by node-llama-cpp macOS arm64 bug (abhigyanpatwari/GitNexus#824)
- Memory backend pluggability — in scope for v4.0 (moved from out-of-scope)
- Local Qdrant in Docker — Qdrant stays cloud; env-configured via `QDRANT_URL` + `QDRANT_API_KEY`

---

## Context

**Tech stack:** Next.js (App Router), React Flow, TypeScript, Tailwind, Vitest
**Codebase:** ~21,800 LOC TypeScript/TSX + Python across `apps/memroos/src/` and `services/`
**Production:** Port 3002, `npm start`, LaunchAgent auto-start, Cloudflare tunnel
**Known debt:**
- GitNexus embeddings partial (285/473) — crash bug upstream
- Library freshness indicator reflects file mtime, not QMD index recency
- Turbopack NFT warning traces `/api/apo` through `next.config.ts` during production build

---

## Key Decisions

| Decision | Outcome | Version |
|----------|---------|---------|
| QMD for BM25 only — Qdrant Cloud for vector/semantic | ✓ Clean separation | v1.3 |
| Skills in Flow canvas (Cookbooks node) not sidebar page | ✓ Shipped, but user expects sidebar page too | v1.2 |
| mem0 writes via HTTP only — never direct Qdrant | ✓ Maintained | v1.3 |
| `collapse-logic.ts` as pure module (no React) | ✓ 24 tests, easy to reason about | v1.3 |
| Group children use `parentId` + `extent:'parent'` | ✓ React Flow native pattern | v1.3 |
| AbortController in NodeDetailPanel for cleanup | ✓ Prevents stale-fetch race | v1.3 |
| Triple-dedup for mem0 ingestion (hash+mtime+origin) | ✓ Zero duplicates confirmed | v1.3 |
| better-sqlite3 singleton with WAL mode | ✓ Single shared DB for all tables | v1.5 |
| SqliteHealthPanel + MemoryIntelligencePanel on Library | ✓ User confirmed panels live on Library, not Ledger | v1.5 |
| Voice server as standalone Python Pipecat service | ✓ Separate port (7860), Next.js proxy via /api/voice-status | v1.5 |
| LLM consolidation on 15m schedule via instrumentation.ts | ✓ Scheduler bootstrap pattern established | v1.5 |
| 4-tier salience decay with LOG() access-resistance | ✓ Formula: rate/(1+LOG(1+access_count)) | v1.5 |
| 18 content scanner patterns with severity tiers | ✓ HIGH blocks, MEDIUM flags, length guard at 4096 | v1.5 |
| TimeSeriesChart as pure presentational component | ✓ No hook calls inside, powered by useTimeSeries | v1.5 |
| Keep private Knowledge Hub content outside the monorepo | ✓ Only service/runtime code imported | v1.6 |
| Tool Attention as progressive discovery layer | ✓ No blanket runtime dependency on mcp-agent | v1.6 |
| Monorepo CI validates Memroos and Python service surfaces | ✓ Added CI workflow | v1.6 |
| Tool gateway is callable directly from MCP clients | ✓ Top-level `tool_*` tools added | v1.7 |
| contextMatchSignal algorithm ported Python→TypeScript | ✓ Exact multipliers (task_type×2, repo×2, agent_id×1, tags×1); task field never read | v1.7 |
| SimilarTaskPanel on Cookbooks page | ✓ Context-ranked recommendations below ToolAttentionPanel | v1.7 |
| Gateway hardening: lint enforced | ✓ Test file ESLint override; `npm run lint` exits 0 in CI | v1.7 |
| A2A as the inter-agent protocol standard | — Pending | v2.0 |
| mem0 graph layer + Neo4j for entity/graph memory | — Pending | v2.0 |
| Qdrant stays cloud — not in Docker compose | ✓ Env-configured via QDRANT_URL/KEY | v2.0 |
| Blessed default install plus operator-customizable profiles | — Pending | v2.0 |
| Docker compose for OSS users only — Luis keeps native workflow | — Pending | v2.0 |
| Security before speed: harden A2A/REST dispatch before caching/performance work | ✓ Reprioritized | v2.1 |
| LLM model choice should be telemetry/eval-driven, not hardcoded | — Pending | v2.2 |
| In-memory LRU cache for API responses (no Redis dependency) | ✓ Shipped | v2.4 |
| Centralized Agent Engagement page owns chat, voice, standups, conference prompts, diagnostics, and dispatch repair | ✓ Shipped | v2.4 repair |

---

## Constraints

- No `execSync`/`exec` — use `execFileSync` or `fs/promises` only
- No recursive `readdir` on Obsidian vault (518+ files, catastrophic inode load)
- Obsidian heartbeat: stat 3-5 known paths only
- Production server: `npm start` on port 3002 — never `npm run dev`
- mem0 collection `agent_memory`: read-only from app — writes via mem0 HTTP API only
