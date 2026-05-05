# Requirements: Agent Kitchen v2.0

**Defined:** 2026-05-04
**Core Value:** Any agent framework plugs into Kitchen — and every agent, knowledge system, and skill becomes visible, connected, and self-improving.

## v2.0 Requirements

### A2A Protocol

- [x] **A2A-01**: Kitchen exposes `/.well-known/agent.json` agent card with name, description, capabilities, and endpoint URLs
- [x] **A2A-02**: Kitchen implements A2A v1 task API with correct spec method names (`tasks/send`, `tasks/get`, `tasks/cancel` verified against A2A v1 spec)
- [x] **A2A-03**: External agent can register with Kitchen via A2A protocol
- [x] **A2A-04**: Kitchen can discover registered A2A agents and their declared capabilities
- [x] **A2A-05**: Kitchen can delegate tasks to registered A2A agents
- [x] **A2A-06**: Google ADK agents register via A2A and appear as nodes in Flow diagram
- [x] **A2A-07**: A2A task progress streams via SSE (server-sent events)
- [x] **A2A-08**: A2A endpoints enforce agent identity and per-task authorization (security scheme defined in agent card)

### Universal REST API

- [x] **REST-01**: Any agent can `POST /api/heartbeat` to report liveness (framework-agnostic)
- [x] **REST-02**: Any agent can `POST /api/skills/report` to report skill usage
- [x] **REST-03**: Any agent can `POST /api/memory/add` to write to unified memory
- [x] **REST-04**: Any agent can `POST /api/tool-attention/record` to log tool outcomes
- [x] **REST-05**: Dynamic agent roster — registered agents stored in DB, zero hardcoding in source
- [x] **REST-06**: Per-agent API key authentication enforced on all REST endpoints

### Agent Registry

- [x] **REG-00**: Single canonical agent registry model (DB schema + service layer) — A2A registration, REST registration, and UI registration are all adapters onto this model
- [x] **REG-01**: Agent registry page in Kitchen UI listing all registered agents (A2A and REST shim)
- [x] **REG-02**: Each agent entry displays capabilities, status, last heartbeat, and protocol type
- [x] **REG-03**: User can register and deregister agents from Kitchen UI

### Orchestration (LangGraph)

- [x] **ORCH-01**: Python LangGraph service with StateGraph for task routing between registered agents
- [x] **ORCH-02**: Checkpoint persistence via SqliteSaver writing to a dedicated `data/orchestration.db` (separate from Kitchen's main SQLite DB to avoid cross-process lock contention)
- [x] **ORCH-03**: Human-in-the-loop (v2.0 scope: approve/reject only) — Kitchen UI shows pending HIL decisions; user approves or rejects and graph resumes from checkpoint
- [x] **ORCH-04**: Capability-based routing — incoming tasks matched to agents by declared capability
- [x] **ORCH-05**: Correlation IDs and task lineage — every hop (Kitchen → LangGraph → agent A → agent B) carries a trace ID, persisted end-to-end
- [x] **ORCH-06**: Basic retry policy — failed agent tasks retried up to N times before rerouting or surfacing as failed HIL decision
- [x] **ORCH-07**: A2A adapter / LangGraph boundary contract — A2A adapter owns transport, protocol, and task state mapping; LangGraph owns routing policy, capability selection, retry, and HIL; they communicate via internal API

### Unified Memory

- [x] **MEM-01**: mem0 graph layer activated with Neo4j as backend
- [x] **MEM-02**: `POST /api/memory/add` routes writes to correct tier based on explicit routing rules (vector for semantic facts, graph for entity relationships, episodic for conversation/event logs)
- [x] **MEM-03**: `GET /api/memory/search` — semantic similarity search against Qdrant Cloud (vector tier)
- [x] **MEM-04**: `GET /api/memory/graph` — entity and relationship queries against Neo4j (graph tier)
- [x] **MEM-05**: Memory tier health panel in Kitchen UI showing status, document/node counts, and last write time for each tier (vector, graph, episodic)

### Operating Profiles

- [x] **PROFILE-01**: Kitchen ships with a blessed default operating profile that works out-of-the-box for local development without hardcoding Luis-specific paths, ports, or agent names
- [x] **PROFILE-02**: Operators can switch or customize install profiles without forking source code (`local-dev`, `single-host`, `private-network`, `cloud-https`, and `custom`)
- [x] **PROFILE-03**: Every topology-specific value is config-driven and documented: public base URLs, service URLs, ports, data paths, agent-card URLs, auth/security mode, memory backends, orchestration endpoint, and allowed remote-agent network policy
- [x] **PROFILE-04**: Setup, Docker, first-run onboarding, and docs all use the same configuration model so the product can run on one laptop, one server, or multiple private-network machines with the same codebase

### Infrastructure

- [x] **INFRA-01**: `.env.example` covers every port, path, API key, and backend URL — zero hardcoded values in application source
- [x] **INFRA-02**: `docker-compose.yml` spins Kitchen + Knowledge MCP + mem0 + Neo4j + Pipecat voice service + LangGraph orchestration service in one command (Qdrant stays cloud, configured via env)
- [x] **INFRA-03**: Pipecat voice service fully env-configured (Gemini API key, service port, Kitchen base URL all via `.env`)
- [x] **INFRA-04**: `setup.sh` validates Qdrant Cloud connectivity and API key at startup — fails fast with a clear actionable error if not configured

### Developer Setup

- [x] **DEV-01**: `setup.sh` detects missing prereqs (Node, Python, Docker), scaffolds `.env` from `.env.example`, and starts all services
- [x] **DEV-02**: First-run wizard — guided setup for required API keys, first agent registration, and end-to-end health check

### Documentation

- [x] **DOCS-01**: README rewrite — what Kitchen is, 5-minute quickstart, architecture overview, when to use A2A vs REST shim
- [x] **DOCS-02**: Architecture diagram — A2A hub, memory tiers (vector/graph/episodic), LangGraph orchestration layer, supported agent frameworks
- [x] **DOCS-03**: Integration guide — Claude Code agents (A2A path)
- [x] **DOCS-04**: Integration guide — Google ADK agents (A2A path)
- [x] **DOCS-05**: Integration guide — LangGraph agents (A2A path + LangGraph-to-LangGraph delegation)
- [x] **DOCS-06**: Integration guide — CrewAI and AutoGen agents (REST shim path)
- [x] **DOCS-07**: REST API reference — all endpoints, authentication, request/response examples
- [x] **DOCS-08**: Memory architecture guide — three tiers, routing rules, when to use each, Neo4j schema

### OSS Polish

- [ ] **OSS-01**: MIT `LICENSE` file
- [ ] **OSS-02**: `CONTRIBUTING.md` — setup, branch conventions, PR process, coding standards
- [ ] **OSS-03**: `SECURITY.md` — security policy and responsible disclosure process
- [ ] **OSS-04**: GitHub issue templates — bug report and feature request
- [ ] **OSS-05**: GitHub Actions CI — typecheck, lint, unit/integration tests, Docker compose smoke test on every PR

## Deferred to v2.1+

- HIL edit-and-continue semantics (modify task state before resuming graph)
- HIL timeout and escalation policies
- Multi-hop retry compensation and rollback
- Memory backend pluggability (beyond mem0 + Qdrant + Neo4j)
- Voice meeting bot (Pipecat as meeting participant)
- Flow trigger button (`qmd update` from UI)
- Library freshness indicator (QMD index recency vs file mtime)
- LLM-powered recall scoring upgrade (embedding over BM25)
- Cross-project recall (similar-task recommendations across repos)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Local Qdrant in Docker compose | Qdrant stays cloud; env-configured via `QDRANT_URL` + `QDRANT_API_KEY` |
| Memory backend pluggability | Fixed stack for v2.0; swappability is v3.0 |
| Multi-user auth | Single-user local tool; OSS users run their own instance |
| Mobile app | Web-first desktop dashboard |
| GitNexus embeddings | Blocked by upstream node-llama-cpp macOS arm64 bug |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| REST-01, REST-02, REST-03, REST-04, REST-05, REST-06 | Phase 34 | Complete |
| REG-00, REG-01, REG-02, REG-03 | Phase 34 | Complete |
| A2A-01, A2A-02, A2A-03, A2A-04, A2A-05, A2A-06, A2A-07, A2A-08 | Phase 35 | Complete |
| ORCH-01, ORCH-02, ORCH-03, ORCH-04, ORCH-05, ORCH-06, ORCH-07 | Phase 36 | Complete |
| MEM-01, MEM-02, MEM-03, MEM-04, MEM-05 | Phase 37 | Complete |
| INFRA-01, INFRA-02, INFRA-03, INFRA-04, PROFILE-01, PROFILE-02, PROFILE-03, PROFILE-04 | Phase 38 | Complete |
| DEV-01, DEV-02, PROFILE-01, PROFILE-02, PROFILE-04 | Phase 39 | Complete |
| DOCS-01, DOCS-02, DOCS-03, DOCS-04, DOCS-05, DOCS-06, DOCS-07, DOCS-08, PROFILE-02, PROFILE-03, PROFILE-04 | Phase 40 | Complete |
| OSS-01, OSS-02, OSS-03, OSS-04, OSS-05 | Phase 41 | Pending |

**Coverage:**
- v2.0 requirements: 53 total
- Unique requirements mapped to phases: 53
- Unmapped: 0 ✓

---
*Requirements defined: 2026-05-04*
*Last updated: 2026-05-05 — added operator-customizable install profiles*
