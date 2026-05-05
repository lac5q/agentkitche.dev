# Roadmap: Agent Kitchen

## Milestones

- ✅ **v1.1 Knowledge Architecture + Dashboard Polish** — Phases 1-5 (shipped 2026-04-11)
- ✅ **v1.2 Live Data + Knowledge Sync** — Phases 6-11 (shipped 2026-04-12)
- ✅ **v1.3 Advanced Observability + Knowledge Depth** — Phases 12-17 (shipped 2026-04-15)
- ✅ **v1.4 Cookbooks** — Phase 18 (shipped 2026-04-15)
- ✅ **v1.5 Agent Coordination + Voice** — Phases 19-25 (shipped 2026-04-20)
- ✅ **v1.6 Monorepo + Progressive MCP Tool Attention** — Phases 26-28 (shipped 2026-04-30)
- ✅ **v1.7 Progressive Tool Gateway Runtime** — Phases 29-33 (shipped 2026-05-04)
- 🚧 **v2.0 A2A Hub — Open Source** — Phases 34-41 (started 2026-05-04)

## Phases

### v2.0 A2A Hub — Open Source (Phases 34-41)

- [ ] **Phase 34: Universal REST API + Canonical Agent Registry** — Framework-agnostic REST endpoints, dynamic agent roster, single canonical registry model
- [ ] **Phase 35: A2A Protocol Implementation + Google ADK** — Agent card, A2A v1 task API, ADK agents register and surface in Flow
- [ ] **Phase 36: LangGraph Orchestration Service** — Python StateGraph, SqliteSaver checkpointing, HIL approve/reject, capability routing
- [ ] **Phase 37: Unified Memory — mem0 Graph + Neo4j** — Three-tier `/api/memory/*` covering vector (Qdrant Cloud) + graph (Neo4j) + episodic (SQLite)
- [ ] **Phase 38: Operating Profiles + Docker Full-Stack** — Zero hardcoding, `.env.example` complete, default/custom install profiles, `docker-compose up` brings all six services healthy (Qdrant stays cloud)
- [ ] **Phase 39: Developer Setup Experience** — `setup.sh` prereq detection + profile-aware scaffolding, first-run wizard for keys + first agent
- [ ] **Phase 40: Documentation + Architecture Diagrams** — README rewrite, architecture diagram, install profile guide, per-framework integration guides, REST + memory references
- [ ] **Phase 41: OSS Polish** — MIT license, CONTRIBUTING, SECURITY, issue templates, public CI with Docker compose smoke

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
**Plans**: TBD
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
**Plans**: TBD
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
**Plans**: TBD
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
**Plans**: TBD
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

**Plans**: TBD

### Phase 39: Developer Setup Experience
**Goal**: A new contributor can clone the repo on a fresh machine and reach a working Kitchen with one registered agent through `setup.sh` plus a guided first-run wizard.
**Depends on**: Phase 38 (compose + env baseline must be in place)
**Requirements**: DEV-01, DEV-02, PROFILE-01, PROFILE-02, PROFILE-04
**Success Criteria** (what must be TRUE):
  1. `./setup.sh` on a fresh machine detects missing prereqs (Node, Python, Docker), scaffolds `.env` from `.env.example`, and starts all services without manual intervention
  2. The first-run wizard guides the user through entering required API keys, registering their first agent, and running an end-to-end health check that passes
  3. Setup presents the recommended default profile first, while allowing an operator to choose or customize topology-specific values for multi-machine use
**Plans**: TBD
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
**Plans**: TBD

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
**Plans**: TBD

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
| 34 | v2.0 | 3/3 | Complete    | 2026-05-05 |
| 35 | v2.0 | 1/4 | In Progress|  |
| 36 | v2.0 | 0/? | Not started | — |
| 37 | v2.0 | 0/? | Not started | — |
| 38 | v2.0 | 0/? | Not started | — |
| 39 | v2.0 | 0/? | Not started | — |
| 40 | v2.0 | 0/? | Not started | — |
| 41 | v2.0 | 0/? | Not started | — |

---

## Backlog

### v2.1+ Ideas (deferred from v2.0)

- HIL edit-and-continue semantics (modify task state before resuming graph)
- HIL timeout and escalation policies
- Multi-hop retry compensation and rollback
- Memory backend pluggability (beyond mem0 + Qdrant + Neo4j) — v3.0 concern
- Voice meeting bot (Pipecat as meeting participant)
- Flow trigger button (`qmd update` from UI)
- Library freshness indicator (QMD index recency vs file mtime)
- LLM-powered recall scoring upgrade (embedding over BM25)
- Cross-project recall (similar-task recommendations across repos)

Run `/gsd-new-milestone` to formally scope v2.1.
