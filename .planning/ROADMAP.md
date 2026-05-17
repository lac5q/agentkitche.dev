# Roadmap: Memoroos

## Milestones

- ✅ **v1.1 Knowledge Architecture + Dashboard Polish** — Phases 1-5 (shipped 2026-04-11)
- ✅ **v1.2 Live Data + Knowledge Sync** — Phases 6-11 (shipped 2026-04-12)
- ✅ **v1.3 Advanced Observability + Knowledge Depth** — Phases 12-17 (shipped 2026-04-15)
- ✅ **v1.4 Cookbooks** — Phase 18 (shipped 2026-04-15)
- ✅ **v1.5 Agent Coordination + Voice** — Phases 19-25 (shipped 2026-04-20)
- ✅ **v1.6 Monorepo + Progressive MCP Tool Attention** — Phases 26-28 (shipped 2026-04-30)
- ✅ **v1.7 Progressive Tool Gateway Runtime** — Phases 29-33 (shipped 2026-05-04)
- ✅ **v2.0 A2A Hub — Open Source** — Phases 34-41 (shipped 2026-05-11)
- ✅ **v2.1 Security + Trust Layer** — Phases 42-45 (shipped 2026-05-11)
- ✅ **v2.2 LLM Optimization + Evaluation** — Phases 46-49 (shipped 2026-05-11)
- ✅ **v2.3 Agent Runtime Enhancements** — Phases 50-52 (shipped 2026-05-11)
- ✅ **v2.4 Performance + Caching** — Phases 53-54 (shipped 2026-05-11)
- ✅ **v2.5 Eval Engine + Self-Improvement Platform** — Phases 57-62 (Tier 1 shipped 2026-05-17; behavioral W-lift deferred to v3)
- [ ] **v3.0 Compliance Platform + Finance Vertical** — Phases 63-68 (planned)
- [ ] **v3.1 Context Reliability + Runtime Resilience** — Phase 69 (planned)

## Phases

<details>
<summary>✅ v2.5 Eval Engine + Self-Improvement Platform (Phases 57-62) — SHIPPED 2026-05-17</summary>

- [x] Phase 57: Eval Engine Core (1/1 plans) — composite W, scorer registry, judge, drift guard, persistence, config/UI
- [x] Phase 58: SEAL Self-Improvement Substrate (2/2 plans) — proposal queue, approval/apply/rollback audit loop, modeled post-apply W re-score
- [x] Phase 59: Memory Autogen Learnings (1/1 plan) — five memory proposal types plus fixed-harness memory policy lab
- [x] Phase 60: Agent Autogen Learnings (1/1 plan) — agent proposal types, trajectory scorer, presets, minimal viable per-role golden sets
- [x] Phase 61: Business-Ops Outcome Layer (L3) (1/1 plan) — KPI events, L3 scorer/poller, CRM/helpdesk/finance adapters
- [x] Phase 62: Public Eval API + SDK (1/1 plan) — tenant-isolated public trace/run/proposal API and TS/Python SDKs

Full archive: `.planning/milestones/v2.5-ROADMAP.md`

Tier 1 shipped with deterministic modeled W-lift for memory/config-style proposal classes. True behavioral W-lift for instruction/skill proposals remains v3 scope.

</details>

### v2.0 A2A Hub — Open Source (Phases 34-41)

- [x] **Phase 34: Universal REST API + Canonical Agent Registry** — Framework-agnostic REST endpoints, dynamic agent roster, single canonical registry model
- [x] **Phase 35: A2A Protocol Implementation + Google ADK** — Agent card, A2A v1 task API, ADK agents register and surface in Flow
- [x] **Phase 36: LangGraph Orchestration Service** — Python StateGraph, SqliteSaver checkpointing, HIL approve/reject, capability routing
- [x] **Phase 37: Unified Memory — mem0 Graph + Neo4j** — Three-tier `/api/memory/*` covering vector (Qdrant Cloud) + graph (Neo4j) + episodic (SQLite)
- [x] **Phase 38: Operating Profiles + Docker Full-Stack** — Zero hardcoding, `.env.example` complete, default/custom install profiles, `docker-compose up` brings all six services healthy (Qdrant stays cloud)
- [x] **Phase 39: Developer Setup Experience** — `setup.sh` prereq detection + profile-aware scaffolding, first-run wizard for keys + first agent
- [x] **Phase 40: Documentation + Architecture Diagrams** — README rewrite, architecture diagram, install profile guide, per-framework integration guides, REST + memory references
- [x] **Phase 41: OSS Polish** — MIT license, CONTRIBUTING, SECURITY, issue templates, public CI with Docker compose smoke

<details>
<summary>✅ v1.1 Knowledge Architecture + Dashboard Polish (Phases 1-5) — SHIPPED 2026-04-11</summary>

- [x] Phase 1: Knowledge Foundations (1/1 plans) — completed 2026-04-09
- [x] Phase 2: Knowledge Curator Agent (2/2 plans) — completed 2026-04-10
- [x] Phase 3: Agent Awareness (1/1 plans) — completed 2026-04-10
- [x] Phase 4: Flow Diagram Upgrade (3/3 plans) — completed 2026-04-10
- [x] Phase 5: Personal Knowledge Ingestion Pipeline (5/5 plans) — completed 2026-04-11

Full archive: `.planning/milestones/v1.1-ROADMAP.md`

</details>

<details>
<summary>✅ v1.2 Live Data + Knowledge Sync (Phases 6-11) — SHIPPED 2026-04-12</summary>

- [x] Phase 6: Library Config Fixes (1/1 plans) — completed 2026-04-12
- [x] Phase 7: Live Heartbeat (1/1 plans) — completed 2026-04-12
- [x] Phase 8: Bidirectional Knowledge Sync (1/1 plans) — completed 2026-04-13
- [x] Phase 9: Skill Management Dashboard (2/2 plans) — completed 2026-04-13
- [x] Phase 10: Flow Diagram UX (1/1 plans) — completed 2026-04-12
- [x] Phase 11: Gwen Self-Improving Loop (1/1 plans) — completed 2026-04-12

Full archive: `.planning/milestones/v1.2-ROADMAP.md`

</details>

<details>
<summary>✅ v1.3 Advanced Observability + Knowledge Depth (Phases 12-17) — SHIPPED 2026-04-15</summary>

- [x] Phase 12: Projects Knowledge Ingestion (1/1 plans) — completed 2026-04-14
- [x] Phase 13: Skill Coverage Gaps (1/1 plans) — completed 2026-04-14
- [x] Phase 14: Skill Failure Rate (2/2 plans) — completed 2026-04-14
- [x] Phase 15: Skill Heatmap (1/1 plans) — completed 2026-04-14
- [x] Phase 16: Per-Node Activity Panel (1/1 plans) — completed 2026-04-14
- [x] Phase 17: Collapsible Node Groups (2/2 plans) — completed 2026-04-15

Full archive: `.planning/milestones/v1.3-ROADMAP.md`

</details>

<details>
<summary>✅ v1.4 Cookbooks (Phase 18) — SHIPPED 2026-04-15</summary>

- [x] Phase 18: Cookbooks Page (1/1 plans) — completed 2026-04-15

Full archive: `.planning/milestones/v1.4-ROADMAP.md`

</details>

<details>
<summary>✅ v1.5 Agent Coordination + Voice (Phases 19-25) — SHIPPED 2026-04-20</summary>

- [x] Phase 19: SQLite Conversation Store (3/3 plans) — completed 2026-04-18
- [x] Phase 20: Hive Mind Coordination (2/2 plans) — completed 2026-04-17
- [x] Phase 21: Paperclip Fleet Node (2/2 plans) — completed 2026-04-18
- [x] Phase 22: Voice Server (2/2 plans) — completed 2026-04-18
- [x] Phase 23: Memory Intelligence (2/2 plans) — completed 2026-04-18
- [x] Phase 24: Security + Audit (2/2 plans) — completed 2026-04-18
- [x] Phase 25: Usage Analytics (2/2 plans) — completed 2026-04-18

Full archive: `.planning/milestones/v1.5-ROADMAP.md`

</details>

<details>
<summary>✅ v1.6 Monorepo + Progressive MCP Tool Attention (Phases 26-28) — SHIPPED 2026-04-30</summary>

- [x] Phase 26: Monorepo Foundation (1/1 plans) — completed 2026-04-30
- [x] Phase 27: Progressive MCP Tool Attention (1/1 plans) — completed 2026-04-30
- [x] Phase 28: Monorepo CI and Deploy Hardening (1/1 plans) — completed 2026-04-30

Full archive: `.planning/milestones/v1.6-ROADMAP.md`

</details>

<details>
<summary>✅ v1.7 Progressive Tool Gateway Runtime (Phases 29-33) — SHIPPED 2026-05-04</summary>

- [x] Phase 29: Top-Level Tool Gateway MCP Tools (1/1 plans) — completed 2026-05-01
- [x] Phase 30: Memory-Aware Tool Selection (2/2 plans) — completed 2026-05-04
- [x] Phase 31: Kitchen Tool Gateway Operations UI (1/1 plans) — completed 2026-05-04
- [x] Phase 32: Wire Python Tool Intelligence to Kitchen UI (4/4 plans) — completed 2026-05-04
- [x] Phase 33: Gateway Hardening (1/1 plans) — completed 2026-05-04

Full archive: `.planning/milestones/v1.7-ROADMAP.md`

</details>

## Phase Details

### Phase 34: Universal REST API + Canonical Agent Registry
**Goal**: Any agent (A2A or otherwise) registers against a single canonical model and reports liveness, skills, memory, and tool outcomes through framework-agnostic REST endpoints — with zero hardcoded agents in source.
**Depends on**: v1.7 shipped (Phase 33)
**Requirements**: REST-01, REST-02, REST-03, REST-04, REST-05, REST-06, REG-00, REG-01, REG-02, REG-03
**Success Criteria** (what must be TRUE):
  1. A non-A2A client (e.g. `curl`) can register an agent, post a heartbeat, and the agent appears in the Kitchen UI Agent Registry page
  2. The registry page lists every registered agent with capabilities, status, last heartbeat, and protocol type; the user can deregister from the UI
  3. All REST endpoints (`/api/heartbeat`, `/api/skills/report`, `/api/memory/add`, `/api/tool-attention/record`) reject requests with missing or invalid per-agent API keys
  4. Source contains zero hardcoded agent identifiers — the Flow page roster is sourced from the canonical registry DB
  5. A2A registration (Phase 35) and UI registration both write through the same canonical registry service (REG-00 contract verified by tests)
**Plans**: 3/3 complete
**UI hint**: yes

### Phase 35: A2A Protocol Implementation + Google ADK Support
**Goal**: Kitchen speaks A2A v1 natively — exposes an agent card, accepts A2A task lifecycle calls, discovers and delegates to registered A2A agents, and a Google ADK agent appears in Flow after registering via A2A.
**Depends on**: Phase 34 (canonical registry must exist before A2A registration adapter)
**Requirements**: A2A-01, A2A-02, A2A-03, A2A-04, A2A-05, A2A-06, A2A-07, A2A-08
**Success Criteria** (what must be TRUE):
  1. `GET /.well-known/agent.json` returns a valid A2A agent card with name, description, capabilities, config-derived endpoint URLs, and security scheme
  2. A Google ADK agent registers via A2A and appears as a node in the Flow diagram with declared capabilities
  3. Kitchen accepts `tasks/send`, `tasks/get`, and `tasks/cancel` calls (verified against the A2A v1 spec) and streams progress via SSE
  4. Kitchen can list registered A2A agents via discovery and successfully delegate a task to one of them
  5. Unauthenticated and unauthorized A2A task requests are rejected per the security scheme declared in the agent card
  6. Kitchen's A2A card, remote-agent registration, ADK fixture, and delegation client use config-derived base URLs/ports/network policy instead of hardcoded localhost assumptions
**Plans**: 4/4 complete
**UI hint**: yes

### Phase 36: LangGraph Orchestration Service (Python, Checkpoint + HIL)
**Goal**: A separate Python LangGraph service routes inbound tasks to registered agents by capability, persists checkpoints to its own SQLite DB, retries on failure, and surfaces human-in-the-loop approve/reject prompts in the Kitchen UI.
**Depends on**: Phase 35 (A2A transport layer in place; LangGraph owns routing policy on top)
**Requirements**: ORCH-01, ORCH-02, ORCH-03, ORCH-04, ORCH-05, ORCH-06, ORCH-07
**Success Criteria** (what must be TRUE):
  1. A task sent to Kitchen routes through LangGraph to a registered agent based on declared capability, and the chosen agent executes it
  2. LangGraph checkpoints persist to a dedicated `data/orchestration.db` (separate from Kitchen's main SQLite DB) — verified by inspecting the file and confirming no cross-process lock contention
  3. A graph node configured for HIL pauses execution and shows a pending approve/reject decision in the Kitchen UI; user approval resumes the graph from checkpoint
  4. A correlation ID generated at task ingress is attached at every hop (Kitchen → LangGraph → agent A → agent B) and is queryable end-to-end
  5. A failing agent task is retried up to N times before surfacing as a failed HIL decision; the A2A adapter / LangGraph boundary contract (ORCH-07) is documented and respected by the implementation
**Plans**: 2/2 complete
**UI hint**: yes

### Phase 37: Unified Memory — mem0 Graph Layer + Neo4j
**Goal**: Kitchen exposes one memory API covering all three tiers — vector (Qdrant Cloud), graph (Neo4j via mem0), episodic (SQLite) — with explicit routing rules and a health panel showing all tiers green.
**Depends on**: Phase 34 (`/api/memory/add` already framework-agnostic from REST baseline)
**Requirements**: MEM-01, MEM-02, MEM-03, MEM-04, MEM-05
**Success Criteria** (what must be TRUE):
  1. `POST /api/memory/add` with `type=graph` writes to Neo4j via mem0's graph layer; `type=vector` writes to Qdrant Cloud; `type=episodic` writes to SQLite
  2. `GET /api/memory/search` returns semantic-similarity hits from Qdrant Cloud
  3. `GET /api/memory/graph` returns entity and relationship results from Neo4j
  4. The memory health panel in Kitchen UI shows status, document/node counts, and last write time for all three tiers (vector, graph, episodic) — all green when services are reachable
  5. Routing rules for which writes go to which tier are documented and validated by tests
**Plans**: 1/1 complete
**UI hint**: yes

### Phase 38: Operating Profiles + Docker Full-Stack
**Goal**: Every port, path, key, backend URL, public base URL, and service topology choice is env/profile-driven; the default profile works out-of-the-box, custom profiles are documented, and `docker-compose up` brings the full OSS stack (Kitchen + Knowledge MCP + mem0 + Neo4j + Pipecat voice + LangGraph orchestration) to a healthy state with Qdrant configured via env to its cloud endpoint.
**Depends on**: Phase 37 (Neo4j must exist as a service to compose)
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, PROFILE-01, PROFILE-02, PROFILE-03, PROFILE-04
**Success Criteria** (what must be TRUE):
  1. `.env.example` enumerates every port, path, API key, and backend URL used in source — a grep audit confirms zero hardcoded values
  2. `docker-compose up` on a clean machine brings all six services healthy (health endpoints reachable) with Qdrant reachable as a cloud endpoint, never a local container
  3. Pipecat voice service starts in compose using only `.env` values (Gemini API key, port, Kitchen base URL)
  4. `setup.sh` validates Qdrant Cloud connectivity (URL + API key) at startup and fails with a clear actionable error when misconfigured
  5. Operators can select or customize `local-dev`, `single-host`, `private-network`, `cloud-https`, or `custom` install profiles without changing application source

**Plans**: 1/1 complete

### Phase 39: Developer Setup Experience
**Goal**: A new contributor can clone the repo on a fresh machine and reach a working Kitchen with one registered agent through `setup.sh` plus a guided first-run wizard.
**Depends on**: Phase 38 (compose + env baseline must be in place)
**Requirements**: DEV-01, DEV-02, PROFILE-01, PROFILE-02, PROFILE-04
**Success Criteria** (what must be TRUE):
  1. `./setup.sh` on a fresh machine detects missing prereqs (Node, Python, Docker), scaffolds `.env` from `.env.example`, and starts all services without manual intervention
  2. The first-run wizard guides the user through entering required API keys, registering their first agent, and running an end-to-end health check that passes
  3. Setup presents the recommended default profile first, while allowing an operator to choose or customize topology-specific values for multi-machine use
**Plans**: 1/1 complete
**UI hint**: yes

### Phase 40: Documentation + Architecture Diagrams
**Goal**: A new OSS user can follow the README quickstart and have an agent connected to Kitchen in under ten minutes; integration paths for every supported framework and the memory architecture are fully documented.
**Depends on**: Phase 39 (setup experience must be stable to be documented)
**Requirements**: DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05, DOCS-06, DOCS-07, DOCS-08, PROFILE-02, PROFILE-03, PROFILE-04
**Success Criteria** (what must be TRUE):
  1. A new user following the README quickstart on a fresh machine has an agent connected to Kitchen in under 10 minutes
  2. The architecture diagram covers the A2A hub, three memory tiers, LangGraph orchestration layer, and supported agent frameworks
  3. Per-framework integration guides exist for Claude Code (A2A), Google ADK (A2A), LangGraph (A2A + L↔L delegation), and CrewAI/AutoGen (REST shim)
  4. REST API reference documents every endpoint with auth and request/response examples
  5. Memory architecture guide explains the three tiers, routing rules, when to use each, and the Neo4j schema
  6. Documentation explains supported operating profiles, how to override defaults, and when to choose private-network versus HTTPS deployment
**Plans**: 1/1 complete

### Phase 41: OSS Polish
**Goal**: The repo is ready for public release — licensed, contributable, with security policy, issue templates, and a public CI that runs typecheck, lint, tests, and a Docker compose smoke on every PR.
**Depends on**: Phase 40 (docs land before public CI gates them)
**Requirements**: OSS-01, OSS-02, OSS-03, OSS-04, OSS-05
**Success Criteria** (what must be TRUE):
  1. Repo contains an MIT `LICENSE` file at root
  2. `CONTRIBUTING.md` covers setup, branch conventions, PR process, and coding standards
  3. `SECURITY.md` documents the security policy and responsible disclosure process
  4. GitHub bug-report and feature-request issue templates exist
  5. GitHub Actions CI runs typecheck, lint, unit/integration tests, and a Docker compose smoke test on every PR — all green on main
**Plans**: 2/2 complete

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|----------|---------------|--------|-----------|
| 1 | v1.1 | 1/1 | Complete | 2026-04-09 |
| 2 | v1.1 | 2/2 | Complete | 2026-04-10 |
| 3 | v1.1 | 1/1 | Complete | 2026-04-10 |
| 4 | v1.1 | 3/3 | Complete | 2026-04-10 |
| 5 | v1.1 | 5/5 | Complete | 2026-04-11 |
| 6 | v1.2 | 1/1 | Complete | 2026-04-12 |
| 7 | v1.2 | 1/1 | Complete | 2026-04-12 |
| 8 | v1.2 | 1/1 | Complete | 2026-04-13 |
| 9 | v1.2 | 2/2 | Complete | 2026-04-13 |
| 10 | v1.2 | 1/1 | Complete | 2026-04-12 |
| 11 | v1.2 | 1/1 | Complete | 2026-04-12 |
| 12 | v1.3 | 1/1 | Complete | 2026-04-14 |
| 13 | v1.3 | 1/1 | Complete | 2026-04-14 |
| 14 | v1.3 | 2/2 | Complete | 2026-04-14 |
| 15 | v1.3 | 1/1 | Complete | 2026-04-14 |
| 16 | v1.3 | 1/1 | Complete | 2026-04-14 |
| 17 | v1.3 | 2/2 | Complete | 2026-04-15 |
| 18 | v1.4 | 1/1 | Complete | 2026-04-15 |
| 19 | v1.5 | 3/3 | Complete | 2026-04-18 |
| 20 | v1.5 | 2/2 | Complete | 2026-04-17 |
| 21 | v1.5 | 2/2 | Complete | 2026-04-18 |
| 22 | v1.5 | 2/2 | Complete | 2026-04-18 |
| 23 | v1.5 | 2/2 | Complete | 2026-04-18 |
| 24 | v1.5 | 2/2 | Complete | 2026-04-18 |
| 25 | v1.5 | 2/2 | Complete | 2026-04-18 |
| 26 | v1.6 | 1/1 | Complete | 2026-04-30 |
| 27 | v1.6 | 1/1 | Complete | 2026-04-30 |
| 28 | v1.6 | 1/1 | Complete | 2026-04-30 |
| 29 | v1.7 | 1/1 | Complete | 2026-05-01 |
| 30 | v1.7 | 2/2 | Complete | 2026-05-04 |
| 31 | v1.7 | 1/1 | Complete | 2026-05-04 |
| 32 | v1.7 | 4/4 | Complete | 2026-05-04 |
| 33 | v1.7 | 1/1 | Complete | 2026-05-04 |
| 34 | v2.0 | 3/3 | Complete | 2026-05-05 |
| 35 | v2.0 | 4/4 | Complete | 2026-05-05 |
| 36 | v2.0 | 2/2 | Complete | 2026-05-05 |
| 37 | v2.0 | 1/1 | Complete | 2026-05-05 |
| 38 | v2.0 | 1/1 | Complete | 2026-05-05 |
| 39 | v2.0 | 1/1 | Complete | 2026-05-05 |
| 40 | v2.0 | 1/1 | Complete | 2026-05-05 |
| 41 | v2.0 | 2/2 | Complete | 2026-05-11 |
| 42 | v2.1 | external/1 | Complete | 2026-05-11 |
| 43 | v2.1 | local/1 | Complete | 2026-05-11 |
| 44 | v2.1 | 1/1 | Complete | 2026-05-11 |
| 45 | v2.1 | 1/1 | Complete | 2026-05-11 |
| 46 | v2.2 | 1/1 | Complete | 2026-05-11 |
| 47 | v2.2 | 1/1 | Complete | 2026-05-11 |
| 48 | v2.2 | 1/1 | Complete | 2026-05-11 |
| 49 | v2.2 | 1/1 | Complete | 2026-05-11 |
| 50 | v2.3 | 1/1 | Complete | 2026-05-11 |
| 51 | v2.3 | 1/1 | Complete | 2026-05-11 |
| 52 | v2.3 | 1/1 | Complete | 2026-05-11 |
| 53 | v2.4 | 1/1 | Complete | 2026-05-11 |
| 54 | v2.4 | 1/1 | Complete | 2026-05-11 |
| 55 | v2.4 repair | 1/1 | Complete | 2026-05-11 |
| 56 | review/qa | 1/1 | Complete | 2026-05-11 |

---

## Backlog

### Future Milestone Priority

1. Begin v3.0 Phase 63 after v2.5 archive is committed.

### Later Ideas

- [ ] HIL edit-and-continue semantics (modify task state before resuming graph)
- HIL timeout and escalation policies
- Multi-hop retry compensation and rollback
- Memory backend pluggability (beyond mem0 + Qdrant + Neo4j) — v3.0 concern
- Voice meeting bot (Pipecat as meeting participant)
- Flow trigger button (`qmd update` from UI)
- Library freshness indicator (QMD index recency vs file mtime)
- LLM-powered recall scoring upgrade (embedding over BM25)
- Cross-project recall (similar-task recommendations across repos)

Run `/gsd-discuss-phase 63` or `$gsd-new-milestone` to start the next milestone workflow.

---

## v3.0 Compliance Platform + Finance Vertical (Phases 63-68)

Compliance infrastructure done right once, with bank transaction reconciliation as the reference vertical. CoVe ships as a callable reliability module across all agent runtimes. Security boundary hardening closes the May 2026 review gaps before the platform is treated as production-ready.

- [ ] **Phase 63**: Rename + Team Auth — Kitchen → Memoroos rename, RBAC (admin/operator/reviewer), multi-user JWT auth, team invitation
- [ ] **Phase 64**: Immutable Audit + HIL Escalation — append-only audit log, every agent/eval/seal decision logged, escalation queue with SLA, CSV/JSON export
- [ ] **Phase 65**: Finance Reconciliation Vertical — bank transaction adapter, reconciliation golden sets, finance UI terminology, FIN-01..03
- [ ] **Phase 66**: Self-hosted Hardening + Compliance Posture — full Docker compose, data residency mode, local judge model support (Ollama/vLLM), admin controls
- [ ] **Phase 67**: CoVe Integration — Chain-of-Verification as callable agent runtime module + registered eval scorer, works on any LLM endpoint, COVE-01..03
- [ ] **Phase 68**: Security Boundary Hardening — operator-only onboarding invites, route-local dispatch auth, strict capability defaults, prompt-injection scanner coverage, CSP/security headers, auth throttling, A2A private-network defaults, SECBOUND-01..08
- [ ] **Phase 69**: Context Source Contracts + Runtime Resilience — declarative source contracts, context health UI/API, stale-source safe-answer gates, generated runtime service installers, and degradation eval/UAT coverage, CTX-01..08

### Phase 63: Rename + Team Auth
**Goal**: Kitchen is renamed to Memoroos throughout, and the platform supports multiple authenticated users with role-based access (admin/operator/reviewer).
**Depends on**: Phase 62 tenant foundation
**Requirements**: RENAME-01, TEAM-01, TEAM-02, TEAM-03
**Success Criteria**:
1. All references to "Kitchen" replaced with "Memoroos" in codebase, UI, docs, package names, and config files
2. Three roles enforced: admin sees everything + user management; operator can run agents, approve SEAL proposals, trigger evals; reviewer is read-only on audit + escalations
3. JWT-based login with per-user API keys; team invitation via email or invite link
**UI hint**: yes

### Phase 64: Immutable Audit + HIL Escalation
**Goal**: Every agent decision, SEAL proposal action, and eval run is appended to an immutable log with actor/timestamp/reason. HIL escalations surface in a team-visible queue with SLA countdown.
**Depends on**: Phase 63 (needs user identity for actor field)
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04
**Success Criteria**:
1. `audit_entries` table is append-only — no UPDATE/DELETE paths exist in code; schema enforced
2. Every agent match/flag/escalate decision, SEAL apply/rollback, and eval run writes an audit entry
3. Audit log queryable by agent, time range, decision type, actor — results in under 200ms on 1M rows
4. CSV and JSON export of any audit query works end-to-end
5. Open HIL escalations appear in team queue with configurable SLA; overdue items flagged red
**UI hint**: yes

### Phase 65: Finance Reconciliation Vertical
**Goal**: Bank transaction reconciliation governance runs on Memoroos — transaction events feed the L3 scorer, reconciliation-specific golden sets power evals, and the UI speaks finance terminology.
**Depends on**: Phase 61 (L3 adapter pattern), Phase 64 (audit trail for every reconciliation decision)
**Requirements**: FIN-01, FIN-02, FIN-03
**Success Criteria**:
1. Transaction adapter ingests bank transaction events (CSV or webhook), maps to correlation_id, persists to `business_outcome_events`
2. Reconciliation golden sets ship with match/mismatch/escalation examples; drift guard validates at 0.85 agreement
3. UI terminology is configurable — "transaction", "reconciliation", "exception" labels replace generic "trace", "eval", "proposal" labels when finance mode is enabled
4. End-to-end demo: agent processes 100 mock transactions, audit log captures all decisions, escalations appear in HIL queue
**UI hint**: yes

### Phase 66: Self-hosted Hardening + Compliance Posture
**Goal**: Memoroos runs fully self-hosted with zero external data egress in data-residency mode; the judge model is configurable to a local Ollama/vLLM endpoint; admin controls are production-ready.
**Depends on**: Phase 63 (auth), Phase 64 (audit)
**Requirements**: INFRA-01, INFRA-02
**Success Criteria**:
1. `docker compose up` brings up full stack: Memoroos app, mem0, Qdrant, Neo4j, SQLite — no external services required
2. Data residency mode: when enabled, all LLM calls route to configured local endpoint; no calls to external APIs
3. Ollama and vLLM endpoints work as drop-in judge model replacements with identical W output
4. Admin panel: user management, API key rotation, audit log retention policy, adapter enable/disable
**UI hint**: yes

### Phase 67: CoVe Integration
**Goal**: Chain-of-Verification ships as a callable 4-step pipeline in the agent runtime (draft → verification questions → independent fact-checks → revised answer) and as a registered eval scorer that measures hallucination reduction vs baseline.
**Depends on**: Phase 57 (eval scorer registry), Phase 63 (Memoroos rename complete)
**Requirements**: COVE-01, COVE-02, COVE-03
**Success Criteria**:
1. `cove(agentFn, config)` wrapper is callable from any agent; executes 4 steps as sequential LLM calls; returns revised answer + verification trace
2. CoVe registered as eval scorer: scores a CoVe-enhanced trace against the baseline trace on the same input; returns hallucination delta
3. Works on Claude API, Hermes via Ollama endpoint, and any OpenAI-compatible endpoint — no model-specific code paths
4. Config: `cove.enabled`, `cove.max_verification_questions`, `cove.parallel_verification` (batch calls), `cove.judge_endpoint`
5. Demo: same prompt run with and without CoVe shows measurable W improvement on a factual golden set
**UI hint**: yes

### Phase 68: Security Boundary Hardening
**Goal**: Close the May 2026 security review gaps by making sensitive route authorization explicit at the handler layer, hardening prompt/content scanning against bypasses, and adding production web-security guardrails.
**Depends on**: Phase 63 (RBAC user identity), Phase 64 (immutable audit log)
**Requirements**: SECBOUND-01, SECBOUND-02, SECBOUND-03, SECBOUND-04, SECBOUND-05, SECBOUND-06, SECBOUND-07, SECBOUND-08
**Source findings**:
1. `/api/onboarding/invite` currently mints signed onboarding tokens without route-local operator/admin authorization, and the proxy operator route list does not cover it.
2. `/api/dispatch` relies on proxy auth while using client-supplied `from_agent` for policy/audit decisions.
3. `scanContent()` allows payloads over the scanner limit without scanning, creating a long-input prompt-injection bypass.
4. Iris prompt-injection coverage is regex-only and currently wired to only part of the free-text task ingress surface.
5. `allowLegacyWhenUndeclared()` permits undeclared capabilities across dispatch, A2A, and memory paths.
6. The checked app surface lacks visible global CSP/security headers and login-specific abuse throttling.
7. A2A remote-card private-network fetches default permissive outside explicit deployment-profile policy.
**Success Criteria**:
1. `/api/onboarding/invite` requires operator-or-admin authorization at the route handler and is listed in proxy operator routes; reviewer tokens cannot mint onboarding invites or grant agent capabilities.
2. `/api/dispatch` requires route-local operator or authenticated-agent authorization; `from_agent` is derived from authenticated identity instead of blindly trusting the request body.
3. Legacy undeclared capability allow mode is disabled for production and non-local profiles; missing dispatch, A2A send, or memory-write capability produces `POLICY_DENIED` plus audit evidence.
4. Iris/content scanning runs on every agent-facing free-text task ingress (`dispatch`, A2A, hive delegation/action, orchestration where applicable) with consistent blocked/flagged audit events.
5. Long scanner input cannot bypass checks: payloads are chunk-scanned or rejected fail-closed above configured limits, with tests covering payloads over 4096 characters.
6. Security headers are configured for app responses: CSP, frame-ancestors/X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy.
7. Login and refresh endpoints have rate limiting or lockout telemetry separate from public trace API throttling.
8. A2A remote-card private-network fetch policy defaults to deny outside explicit local-dev/private-network profiles; metadata and link-local addresses remain always blocked.
**UI hint**: no

## v3.1 Context Reliability + Runtime Resilience (Phase 69)

The May 2026 dogfood incidents showed that Memoroos needs to treat external
context lanes as product-owned middleware, not invisible local machine state.
Phase 69 turns Gmail, Spark, qmd, mem0, and future sources into explicit source
contracts with health, freshness, indexing proof, safe-answer behavior, and
recurring degradation evals.

### Phase 69: Context Source Contracts + Runtime Resilience
**Goal**: Every enabled context source declares how it is ingested, indexed, monitored, alerted, and safely used; operators can see source health in the UI and agents fail closed when source-backed context is stale or missing.
**Depends on**: Phase 37 (memory tiers), Phase 39 (setup), Phase 40 (docs), Phase 68 (security boundary patterns)
**Requirements**: CTX-01, CTX-02, CTX-03, CTX-04, CTX-05, CTX-06, CTX-07, CTX-08
**Source findings**:
1. Gmail ingestion was scheduled but silently failed after a missing virtualenv path.
2. Spark had the transcript but indexing lag, blank attendees, and project misclassification hid it from Cordant context.
3. qmd collections and MCP services are operationally central but largely local machine state.
4. mem0 can preserve queued writes while semantic recall is stale unless queue status is surfaced.
5. Meeting minutes and source-backed artifacts must not be reconstructed from adjacent decks when the transcript/source lane is stale.
6. launchd/cron service definitions need generated install/status/uninstall flows instead of hardcoded local paths.
**Success Criteria**:
1. `context-sources.config.json` or equivalent declares source id, type, required tools/env, source path, ingest/index commands, freshness threshold, qmd collection, and safe-answer policy.
2. `/api/context/health` returns per-source `ok|stale|missing|degraded|disabled` with last run, age, doc count, index marker, and repair hint.
3. Operator UI shows Gmail, Spark, qmd, mem0, and local-folder source health with freshness and searchability evidence.
4. Source-backed tasks check required source contracts and return `SOURCE_STALE` or `SOURCE_MISSING` instead of hallucinating or reconstructing from unrelated material.
5. Runtime service installer generates path-correct launchd jobs for supported macOS services and exposes `install`, `status`, `uninstall`, and `check`.
6. Generated services read env files or keychain-compatible env sources; no secrets are embedded in committed plist templates.
7. `npm run eval:context-sources` or the expanded degradation suite covers memory queue backlog, qmd stale/down, Gmail runner failure, Spark source unindexed/misclassified, and stale-source safe-answer behavior.
8. Docs include a troubleshooting page for proving a source is ingested, indexed, searchable, and safe to use.
**UI hint**: yes
