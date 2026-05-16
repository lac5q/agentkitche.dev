# Roadmap: Agent Kitchen

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
- 🚧 **v2.5 Eval Engine + Self-Improvement Platform** — Phases 57-62 (scoping)

## Phases

### v2.5 Eval Engine + Self-Improvement Platform (Phases 57-62)

Single coherent eval substrate dogfooded internally and shipped as an external product surface. Default scoring is a **3-layer composite scalar `W`** (L1 capability + L2 LLM-as-judge + L3 business outcome), used as the keep/discard signal for all autogen learning loops. See `.planning/notes/eval-engine-3-layer-composite.md` for the locked decision record.

- [ ] **Phase 57**: Eval Engine Core — scorer registry, 3-layer composite W, pinned cross-family judge, golden-set framework, drift guard, config surface + UI mirror
- [ ] **Phase 58**: SEAL Self-Improvement Substrate — reflection → typed proposals → operator approval → apply → rerun-evals → keep-if-W-improved → rollback/audit
- [ ] **Phase 59**: Memory Autogen Learnings — 5 memory proposal types + Karpathy-style fixed-harness memory policy lab
- [ ] **Phase 60**: Agent Autogen Learnings — agent_instruction_patch / skill_addition / tool_routing_update + per-role golden sets + trajectory evals
- [ ] **Phase 61**: Business-Ops Outcome Layer (L3) — trace post-hoc metrics + CRM/helpdesk/finance adapters + per-company KPI weighting
- [ ] **Phase 62**: Public Eval API + SDK — framework-agnostic HTTP surface, BYO agent trace format, dogfooded by 59/60, shipped externally

Open questions tracked in `.planning/research/questions.md`. External product packaging decisions deferred — see `.planning/seeds/eval-engine-as-product.md`.

### Phase 57: Eval Engine Core
**Goal**: A scorer registry, 3-layer composite `W` scalar, pinned cross-family LLM judge with drift guard, and a `memroos.eval.yaml` config surface (mirrored in the UI) ship and produce a single normalized 0–1 keep/discard signal for any registered agent trace.
**Depends on**: v2.0 baseline (registry, memory, REST surface) — phases 34-41
**Requirements**: EVAL-01, EVAL-02, EVAL-03, EVAL-04, EVAL-05, EVAL-06, EVAL-07, EVAL-08, EVAL-09, EVAL-10
**Success Criteria** (what must be TRUE):
  1. A registered agent's trace, scored through the registry, returns a composite `W ∈ [0,1]` with per-layer L1/L2/L3 breakdown and per-scorer detail
  2. Default judge (`claude-haiku-4-5-20251001`) and weights `{0.2, 0.5, 0.3}` are config-loaded from `memroos.eval.yaml`; UI panel reflects and edits the same source of truth
  3. Drift guard runs the configured golden-set agreement check before `W` is trusted in any autogen loop and halts with an operator-visible flag below 0.85 agreement
  4. Position-bias swap augmentation is wired into the L2 judge call; cross-family constraint blocks any same-family agent/judge pairing in CI
  5. Every eval run persists layer breakdown, judge model + prompt version, golden-set version, and per-example scores — queryable for any past run
  6. Memory recall ships as a registered L1+L2 scorer (not a bespoke memory-only path), proving the registry contract
**UI hint**: yes

### Phase 58: SEAL Self-Improvement Substrate
**Goal**: A generic reflection → typed-proposal → operator-approval → apply → rerun-evals → keep-if-W-improved → rollback loop runs end-to-end against a mutation surface plugged in via a closed proposal-type registry, with full audit trail.
**Depends on**: Phase 57 (composite W is the keep/discard signal)
**Requirements**: SEAL-01, SEAL-02, SEAL-03, SEAL-04, SEAL-05, SEAL-06
**Success Criteria** (what must be TRUE):
  1. Reflection on a low-W trace produces at least one typed proposal of a registered type with a forecast W-delta and a human-readable rationale
  2. The Kitchen UI operator approval queue shows pending proposals with diff, forecast W-delta, and approve/reject controls; decisions are persisted
  3. An approved proposal is applied in an isolated context, evals rerun against the same golden set, and the mutation is kept only if composite W ≥ baseline
  4. A regressed mutation is rolled back automatically; the apply/rollback decision and all per-layer W deltas are persisted in an immutable audit log
  5. The proposal-type registry is a closed enum at v1 — adding a new type requires a registry update commit (not a runtime plugin); v2+ extension path is documented
**UI hint**: yes

### Phase 59: Memory Autogen Learnings
**Goal**: Five memory-specific proposal types (`memory_rewrite`, `query_hint`, `salience_update`, `tier_route`, `eval_case_addition`) ride on the SEAL substrate from Phase 58, and a Karpathy-style fixed-harness memory policy lab can rank memory-policy variations by composite `W`.
**Depends on**: Phase 58 (SEAL substrate must accept registered proposal types)
**Requirements**: MEMGEN-01, MEMGEN-02, MEMGEN-03, MEMGEN-04, MEMGEN-05, MEMGEN-06
**Success Criteria** (what must be TRUE):
  1. All five memory proposal types register against the Phase 58 substrate and round-trip through reflection → approval → apply → evals → keep/rollback
  2. The fixed-harness memory policy lab can take N policy variants and produce a ranked W-table from the same golden set deterministically
  3. At least one observed memory miss in the dogfood corpus produces an `eval_case_addition` proposal that, after operator approval, is added to the golden set and used in subsequent evals
  4. A memory-only SEAL loop run (the original phase 57 scope) succeeds end-to-end on dogfood data and improves composite `W` on the memory-recall scorer

### Phase 60: Agent Autogen Learnings
**Goal**: Three agent-level proposal types (`agent_instruction_patch`, `skill_addition`, `tool_routing_update`) ship with per-role golden sets (sales/support/finance/ops, ~50 examples each), trajectory evals (Phoenix-style), and named weight preset profiles so operators can adopt the loop without manual weight tuning.
**Depends on**: Phase 58 (SEAL substrate), Phase 59 (proves substrate is generic over mutation surface)
**Requirements**: AGENTGEN-01, AGENTGEN-02, AGENTGEN-03, AGENTGEN-04, AGENTGEN-05, AGENTGEN-06
**Success Criteria** (what must be TRUE):
  1. All three agent proposal types register against the Phase 58 substrate and round-trip through the full loop on at least one of the four per-role golden sets
  2. Four per-role golden sets (sales, support, finance, ops) ship in `golden-sets/`, each ~50 examples, with documented authorship and human-validated agreement above the 0.85 drift-guard floor
  3. Trajectory evals score full multi-step agent runs (not just single-turn output) and feed the trajectory score into the L2 layer of composite `W`
  4. Three named preset profiles (`outcome-weighted`, `quality-weighted`, `compliance-weighted`) are selectable from the UI and `memroos.eval.yaml` — picking one swaps the weight vector without manual dialing
  5. The agent autogen loop, run on a single role golden set, lifts composite `W` after at least one approved proposal — demonstrated end-to-end on dogfood data
**UI hint**: yes

### Phase 61: Business-Ops Outcome Layer (L3)
**Goal**: Post-hoc business-system outcome signals (Anthropic + Fin/Intercom canonical KPI set) flow into the L3 layer of composite `W` via three business-system adapters covering CRM, helpdesk, and finance, with per-company KPI weighting and a business-ops dashboard for per-agent `W` over time.
**Depends on**: Phase 57 (L3 is a scorer layer in the registry)
**Requirements**: L3-01, L3-02, L3-03, L3-04, L3-05, L3-06
**Success Criteria** (what must be TRUE):
  1. Trace post-hoc extractor produces the canonical KPI set (completion rate, escalation rate, TTR p50, operator approval rate, cost-per-task) for any completed task, keyed by correlation ID
  2. CRM adapter (Salesforce + HubSpot v1) pulls deal-advance / lead-disposition signals keyed by correlation ID and emits them as L3 scorer inputs
  3. Helpdesk adapter (Zendesk + Intercom v1) pulls resolution / CSAT / escalation signals keyed by correlation ID and emits them as L3 scorer inputs
  4. Finance-system adapter (QuickBooks + NetSuite v1) pulls transaction-posted / reconciled signals keyed by correlation ID and emits them as L3 scorer inputs
  5. Operators define per-company L3 weights in `memroos.eval.yaml` (no code change required) and the resulting composite `W` reflects the per-company KPI ranking
  6. Business-ops dashboard renders per-agent W timeline with L1/L2/L3 breakdown and click-through to the source trace and the originating business-system record
**UI hint**: yes

### Phase 62: Public Eval API + SDK
**Goal**: A framework-agnostic HTTP eval surface accepts customer agent traces (OpenInference candidate standard or documented JSON) and returns `W` + layer breakdown + proposal queue; TS/Python SDKs wrap the API; phases 59 and 60 dogfood the public surface to prove the contract.
**Depends on**: Phase 57 (eval engine produces W), Phase 58 (proposal queue exists), Phase 59+60 (proves the substrate is real before opening to customers)
**Requirements**: API-01, API-02, API-03, API-04, API-05, API-06
**Success Criteria** (what must be TRUE):
  1. A customer can `POST` an agent trace to the public eval API surface and receive `W` + L1/L2/L3 breakdown + any proposal IDs queued for that trace, scoped to their tenant
  2. The API accepts OpenInference-formatted traces (candidate standard) and a documented MemroOS JSON format; round-trip parsing and scoring is identical across formats
  3. TypeScript and Python SDKs ship with idiomatic per-language ergonomics and a smoke-test that runs the quickstart example against a sample trace + sample golden set
  4. Per-customer API keys enforce tenant isolation — no cross-tenant trace, golden set, or proposal visibility; verified by test
  5. The customer-facing quickstart ("first eval in 5 minutes") guides a new user from `pip install memroos` (or `npm i`) through their first scored trace with a sample golden set
  6. The Phase 59 memory autogen loop and the Phase 60 agent autogen loop use the public API surface end-to-end (not an internal-only path) — proving the framework-agnostic contract on real internal traffic

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

1. Define the next product milestone after the completed v2.0-v2.4 roadmap and Phase 55 engagement repair. *(v2.5 Eval Engine + Self-Improvement Platform is now scoped — phases 57–62. Run `/gsd-new-milestone v2.5` to formally promote.)*

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

Run `/gsd-new-milestone` to formally define the next milestone after v2.4.

---

## v3.0 Compliance Platform + Finance Vertical (Phases 63–67)

Compliance infrastructure done right once, with bank transaction reconciliation as the reference vertical. CoVe ships as a callable reliability module across all agent runtimes.

- [ ] **Phase 63**: Rename + Team Auth — Kitchen → Memoroos rename, RBAC (admin/operator/reviewer), multi-user JWT auth, team invitation
- [ ] **Phase 64**: Immutable Audit + HIL Escalation — append-only audit log, every agent/eval/seal decision logged, escalation queue with SLA, CSV/JSON export
- [ ] **Phase 65**: Finance Reconciliation Vertical — bank transaction adapter, reconciliation golden sets, finance UI terminology, FIN-01..03
- [ ] **Phase 66**: Self-hosted Hardening + Compliance Posture — full Docker compose, data residency mode, local judge model support (Ollama/vLLM), admin controls
- [ ] **Phase 67**: CoVe Integration — Chain-of-Verification as callable agent runtime module + registered eval scorer, works on any LLM endpoint, COVE-01..03

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
