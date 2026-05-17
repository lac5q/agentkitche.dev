# MemroOS

<p align="center">
  <strong>Memory OS for agent workflows.</strong>
</p>

<p align="center">
  MemroOS retains what product, sales, and engineering agents learn, retrieves the right context at runtime, and turns repeated work into durable skills.
</p>

<p align="center">
  <a href="https://memroos.com">memroos.com</a> ·
  <a href="#quickstart">Quickstart</a> ·
  <a href="#video-demo">Video Demo</a> ·
  <a href="#screenshots">Screenshots</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#security-model">Security</a> ·
  <a href="#docs">Docs</a>
</p>

<p align="center">
  <a href="https://github.com/lac5q/memroos/blob/main/LICENSE"><img alt="License: PolyForm Small Business 1.0.0" src="https://img.shields.io/badge/license-PolyForm%20Small%20Business-a8392c.svg"></a>
  <img alt="Release: v0.1.0" src="https://img.shields.io/badge/release-v0.1.0-a8392c.svg">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black.svg">
  <img alt="A2A ready" src="https://img.shields.io/badge/A2A-ready-7a2a1e.svg">
  <img alt="Local first" src="https://img.shields.io/badge/local--first-yes-4a4a45.svg">
  <img alt="Security" src="https://img.shields.io/badge/security-operator--gated-a8392c.svg">
</p>

---

## What MemroOS Is

Most agent systems remember too little, too late. Product decisions live in docs. Sales context lives in calls and CRM notes. Engineering knowledge lives in commits, incidents, and terminal history. Every new agent starts by rediscovering the same context.

MemroOS is the operating layer that gives agents a memory plane:

- **Retain:** capture decisions, files, conversations, outcomes, and workflow history.
- **Retrieve:** assemble permission-aware context packs before an agent starts work.
- **Dispatch:** send work to local, REST, or A2A agents with source-backed context.
- **Improve:** promote repeated successful workflows into durable skills and playbooks.

The repository began as `agentkitchen.dev`; some internal package names, paths, and environment variables still use `kitchen` for compatibility. The public product and positioning are now MemroOS.

## Video Demo

<p align="center">
  <video src="docs/demo/memroos-demo.mp4" controls muted playsinline width="900"></video>
</p>

<p align="center">
  <a href="docs/demo/memroos-demo.mp4">Watch the MemroOS demo video</a>
</p>

## Screenshots

<p align="center">
  <img src="docs/screenshots/readme-landing.png" alt="MemroOS landing page showing the runtime context pack for product, sales, and engineering agents" width="900">
</p>

<p align="center">
  <em>The public landing page leads with retained agent knowledge, runtime context packs, and product/sales/engineering workflows.</em>
</p>

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/readme-memory.png" alt="MemroOS memory page with multi-memory search, retained context, and activity heatmap"></td>
    <td width="50%"><img src="docs/screenshots/readme-knowledge.png" alt="MemroOS knowledge page showing source corpus health and knowledge collections"></td>
  </tr>
  <tr>
    <td><strong>Memory</strong><br>Search retained context across vector, graph, and episodic memory before handing work to an agent.</td>
    <td><strong>Knowledge</strong><br>Track source files, freshness, collections, and knowledge health for agent consumption.</td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/readme-dispatch.png" alt="MemroOS dispatch page with A2A cards and live delegations"></td>
    <td width="50%"><img src="docs/screenshots/readme-skills.png" alt="MemroOS skills page showing procedural playbooks and skill analytics"></td>
  </tr>
  <tr>
    <td><strong>Engage</strong><br>Dispatch tasks, chat with agent runtimes, and inspect live delegation state.</td>
    <td><strong>Skills</strong><br>See which repeated workflows are becoming reusable procedural playbooks.</td>
  </tr>
</table>

## Why This Exists

Native AI companies are moving from one-off prompt demos to agent workflows that touch roadmap, revenue, code, support, operations, and internal tools. The hard problem is no longer "can an agent answer?" It is:

- What does the agent already know?
- Where did that knowledge come from?
- Which memory did it consume before acting?
- What should be retained from the outcome?
- When should repeated work become a skill?
- Which agent is allowed to do what?

MemroOS is built for that layer.

## Primary Use Cases

### Product

Retain customer interviews, launch notes, roadmap decisions, objections, and beta learnings. Retrieve them into PRDs, prioritization work, release notes, and follow-up workflows.

### Sales

Retain CRM notes, call takeaways, buyer preferences, competitor mentions, and account history. Retrieve them into account briefs, talk tracks, follow-up, and expansion plans.

### Engineering

Retain architecture decisions, incidents, deploy fixes, repo patterns, and code review outcomes. Retrieve them into debug plans, migrations, reviews, onboarding, and runbooks.

## What You Can Do In 5 Minutes

After setup, you can:

1. Open the MemroOS workspace.
2. Search retained memory across product, sales, engineering, and operational context.
3. Inspect source corpus health in the Knowledge view.
4. Register a local, REST, or A2A-compatible agent.
5. Dispatch work and inspect live delegation state.
6. Review skill proposals before they modify instructions or playbooks.
7. Keep memory, knowledge, skills, agents, usage, and governance in one operator surface.

## Release 0.1

`v0.1.0` is the first public operator preview of MemroOS.

The current release includes:

- A Next.js workspace with Memory, Knowledge, Skills, Agents, Workflow Map, Engage, Improvements, Usage, and Governance surfaces.
- A canonical SQLite-backed agent registry for REST, UI, and A2A-visible agents.
- A2A card ingestion, task routes, streaming subscription endpoints, and Google ADK compatibility fixtures.
- REST reporting endpoints for heartbeats, memory writes, skill reports, and tool outcomes.
- Memory and knowledge visibility across configured file collections, mem0/Qdrant, graph memory, and local SQLite.
- Human-gated Agent Lightning/APO approvals so self-learning proposals queue before mutating agent instructions.

## Completed Roadmap

- **Phase 41: Public Polish** - public README, contribution guide, security policy, issue templates, and GitHub Actions checks for public collaboration.
- **Phases 42-45: v2.1 Security + Trust Layer** - Iris dispatch preflight, prompt-injection checks, tool-permission governance, security reporting, and progressive capability exposure.
- **Phases 46-49: v2.2 LLM Optimization + Evaluation** - model-routing telemetry, recommendation surfaces, evaluation fixtures, optimization dashboards, and quality reports.
- **Phases 50-52: v2.3 Agent Runtime Enhancements** - runtime middleware, memory client v2 paths, richer engagement state, and observability surfaces for live agents.
- **Phases 53-54: v2.4 Performance + Caching** - response caching, query-path tuning, and faster memory/knowledge retrieval for operator workflows.

## What MemroOS Does

- **Memory search:** Search retained context before an agent starts work.
- **Knowledge corpus:** Track files, freshness, collections, and source health.
- **Skill analytics:** Watch repeatable workflows become procedural playbooks.
- **Agent registry:** Maintain one canonical roster for local, REST, UI, and A2A agents.
- **A2A broker:** Expose agent cards, JSON-RPC endpoints, task lifecycle routes, SSE task updates, and outbound A2A delegation.
- **REST shim:** Let agents report heartbeats, memories, skills, and outcomes before they speak A2A.
- **Workflow map:** Visualize agents, memory, skills, dispatch paths, and infrastructure.
- **Governance:** Gate registry writes, memory reads, destructive actions, and self-learning approvals.

## What MemroOS Is Not

- Not a replacement for Claude Code, Codex, OpenClaw, Hermes, Google ADK, LangGraph, CrewAI, or AutoGen.
- Not a hosted SaaS control plane in this repo.
- Not an excuse to expose private agents directly to the public internet.
- Not finished. It is useful, inspectable, hackable, and moving quickly.

## Architecture

MemroOS is intentionally thin at the boundary and durable at the center.

```mermaid
flowchart TB
  subgraph Workflows["Agent Workflows"]
    Product["Product agents"]
    Sales["Sales agents"]
    Engineering["Engineering agents"]
    Ops["Operations agents"]
  end

  subgraph MemroOS["MemroOS"]
    UI["Workspace UI"]
    Registry[("Agent Registry")]
    Broker["A2A Broker"]
    REST["REST Shim"]
    Dispatch["Engage + Delegations"]
    Governance["Governance + Audit"]
  end

  subgraph Memory["Memory + Knowledge"]
    Vector["mem0 + Qdrant"]
    Graph["Graph Memory"]
    Episodic[("SQLite Episodic Memory")]
    Library["Knowledge Collections"]
    Skills["Procedural Skills"]
  end

  subgraph Runtimes["Agent Runtimes"]
    Claude["Claude Code"]
    Codex["Codex CLI"]
    ADK["Google ADK"]
    OpenClaw["OpenClaw"]
    Custom["Custom HTTP agents"]
  end

  Product --> UI
  Sales --> UI
  Engineering --> UI
  Ops --> UI

  UI --> Registry
  UI --> Dispatch
  Dispatch --> Broker
  Dispatch --> REST
  Broker --> Registry
  REST --> Registry
  REST --> Governance
  Broker --> Governance

  REST --> Vector
  REST --> Graph
  REST --> Episodic
  UI --> Library
  UI --> Skills
  Skills --> Dispatch

  Broker --> ADK
  REST --> Claude
  REST --> Codex
  REST --> OpenClaw
  REST --> Custom
```

### Memory Loop

```mermaid
sequenceDiagram
  participant Agent
  participant MemroOS
  participant Registry
  participant Memory
  participant Operator

  Agent->>MemroOS: Register or present A2A card
  MemroOS->>Registry: Store identity, protocol, capabilities
  Agent->>MemroOS: Heartbeat / skill report / memory write
  MemroOS->>Memory: Route memory to vector, graph, or episodic tier
  Operator->>MemroOS: Search retained context
  Operator->>MemroOS: Dispatch task with context
  MemroOS->>Registry: Resolve target agent
  MemroOS->>Agent: REST or A2A task request
  Agent->>MemroOS: Outcome, result, skill signal
  MemroOS->>Memory: Retain what changed
```

## Quickstart

### Prerequisites

- Node.js and npm
- Python 3
- Docker with Docker Compose
- Optional: Qdrant Cloud URL and API key for vector memory
- Optional: Tailscale for multi-machine private networking

```bash
git clone https://github.com/lac5q/memroos.git
cd memroos
npm install
./setup.sh --wizard
./setup.sh
```

On macOS, `setup.sh` also installs the Memory Resilience monitors by default:

- `com.memroos.memory-healthcheck`: every 5 minutes, checks mem0, QMD, queued writes, Gmail context freshness, and embedding round-trip health.
- `com.memroos.memory-degradation-evals`: daily at 9:15 AM, runs the degradation regression suite.

Set `INSTALL_MEMORY_RESILIENCE=0` before `./setup.sh` to skip launchd monitor installation, or run `npm run install:memory-resilience` later.

Open MemroOS:

```text
http://localhost:3000
```

For a local production-style server:

```bash
npm --prefix apps/kitchen run build
KITCHEN_PUBLIC_BASE_URL=http://localhost:3002 \
KITCHEN_A2A_ENDPOINT_BASE_URL=http://localhost:3002 \
npm --prefix apps/kitchen run start -- --port 3002
```

The environment variable prefix is still `KITCHEN_*` for compatibility with existing installs.

## Recommended Deployment

MemroOS is designed to start private and become public only when you mean it.

```mermaid
flowchart LR
  Founder["Founder laptop"] <--> Tailnet["Tailscale / private LAN"]
  Server["MemroOS server"] <--> Tailnet
  Agents["Agent machines"] <--> Tailnet
  Tailnet --> Auth["Operator key + per-agent bearer keys"]
  Auth --> MemroOS["MemroOS"]
```

Operating profiles:

- `local-dev`: one developer machine; loopback registry writes can work without an operator key.
- `single-host`: all services on one server or VM; operator key required.
- `private-network`: recommended startup deployment for multiple machines on Tailscale or LAN.
- `cloud-https`: internet-reachable deployment behind HTTPS reverse proxy or tunnel.
- `custom`: operator-defined topology with explicit environment values.

See [Install profiles](docs/install-profiles.md).

## Agent Registry

MemroOS has one canonical registry. The `/agents` page shows the DB-backed roster, not ad hoc files.

### Register a REST agent

```bash
curl -X POST http://localhost:3000/api/agents/register \
  -H 'Content-Type: application/json' \
  -H 'x-kitchen-operator-key: <operator-key>' \
  -d '{
    "id": "worker-1",
    "name": "Worker 1",
    "role": "Research and implementation agent",
    "platform": "codex",
    "protocol": "rest",
    "location": "tailscale",
    "host": "agent.tailnet",
    "port": 8787,
    "healthEndpoint": "/health"
  }'
```

### Register an A2A agent by card URL

```bash
curl -X POST http://localhost:3000/api/a2a/agents/register \
  -H 'Content-Type: application/json' \
  -H 'x-kitchen-operator-key: <operator-key>' \
  -d '{
    "cardUrl": "http://agent.tailnet:8000/.well-known/agent-card.json",
    "source": "a2a"
  }'
```

The response may include an API key unless `issueApiKey` is false. Store it securely. MemroOS never displays stored bearer tokens after creation.

### One-command agent onboarding

For agents that can run shell commands, create a short-lived invite and hand the returned command to the agent. The invite registers the agent, mints its per-agent API key, and returns a MemroOS MCP config.

```bash
curl -X POST http://localhost:3000/api/onboarding/invite \
  -H 'Content-Type: application/json' \
  -H 'x-kitchen-operator-key: <operator-key>' \
  -d '{
    "agentId": "maria",
    "name": "Maria",
    "role": "Research and implementation partner",
    "platform": "openclaw",
    "ttlMinutes": 15
  }'
```

Give the `command` from the response to the agent. The command looks like:

```bash
curl -fsSL 'https://memroos.example/api/onboarding/script?token=...' | bash -s -- --id 'maria' --name 'Maria' --role 'Research and implementation partner' --platform 'openclaw' --mcp-target 'auto'
```

The default `--mcp-target auto` selects the right installer from the platform: `hermes`, `openclaw`, `claude`, `gemini`, `qwen`, `codex`, or `stdout` for ChatGPT. ChatGPT cannot run the shell command directly; for ChatGPT, use the returned `mcpUrl` as the custom connector URL in ChatGPT Apps & Connectors.

## Add MemroOS To Agent Clients

### ChatGPT

ChatGPT uses remote MCP over HTTP. Start the MCP facade and expose it through a trusted HTTPS URL such as Tailscale Funnel, Cloudflare Tunnel, or your own private gateway:

```bash
cd /path/to/memroos
KITCHEN_MCP_PUBLIC_BASE_URL=https://memroos.example npm run install:mcp:chatgpt
```

The connector URL is:

```text
https://memroos.example/mcp
```

In ChatGPT, open **Settings -> Connectors -> Advanced -> Developer mode**, add a remote MCP server, name it `MemroOS`, and use the `/mcp` URL above.

### Claude Desktop

Claude Desktop can run MemroOS locally over stdio. Edit:

```text
~/Library/Application Support/Claude/claude_desktop_config.json
```

Add or merge this server entry:

```json
{
  "mcpServers": {
    "memroos": {
      "command": "/bin/bash",
      "args": [
        "-lc",
        "exec \"${AGENT_KITCHEN_ROOT:-$HOME/github/memroos}/scripts/agentkitchen-mcp.sh\""
      ]
    }
  }
}
```

Fully quit and reopen Claude Desktop after saving the file. If your local clone is somewhere else, either set `AGENT_KITCHEN_ROOT` or replace `$HOME/github/memroos` with the absolute path to this repo.

## Protocol Strategy

```mermaid
flowchart TD
  Start["New agent"] --> Card{"Can expose A2A card?"}
  Card -->|Yes| A2A["Register via /api/a2a/agents/register"]
  Card -->|No| Rest["Register via /api/agents/register"]
  A2A --> Tasks["Use task lifecycle, streaming, card metadata"]
  Rest --> Shim["Use heartbeat, memory, skills, outcomes"]
  Shim --> Later["Upgrade to A2A when framework supports it"]
```

Use **A2A** when the framework can expose or consume an agent card and task lifecycle. Use the **REST shim** when the framework does not speak A2A yet or when you only need reporting: heartbeat, memory writes, skill outcomes, and registry visibility.

## Memory And Knowledge

MemroOS keeps source knowledge and retained memory separate on purpose.

```mermaid
flowchart LR
  subgraph Knowledge["Knowledge files"]
    Skills["skills"]
    Projects["projects"]
    Emails["emails"]
    Meetings["meetings"]
    Runtime["skill runtimes"]
  end

  subgraph Memory["Memory entries"]
    Vector["Vector memory"]
    Graph["Graph memory"]
    Episodic["SQLite episodic memory"]
  end

  Knowledge --> Library["Knowledge UI"]
  Memory --> Search["Memory search"]
  Search --> Context["Runtime context packs"]
  Context --> Agents["Agent workflows"]
```

Knowledge files are counted from configured collections. Memory entries live in separate memory services and SQLite tables, so a collection file count is not the same thing as total memories.

## Progressive Capabilities

MemroOS treats specialized systems as optional progressive capabilities. They can be checked during setup, shown in tool-attention, and recommended from outcome history without becoming required dependencies for every install.

Enable the current optional bundle with:

```env
KITCHEN_OPTIONAL_CAPABILITIES=gitnexus,agent-lightning
```

Current bundled capabilities:

- **GitNexus:** Code graph and impact analysis capability. MemroOS catalogs the capability, reports status, and helps agents decide when to load it.
- **Agent Lightning/APO:** Human-gated self-learning proposal workflow. MemroOS owns the operator UI/API approval queue while worker CLIs apply approved proposals.

## Security Model

MemroOS is built for private-network production first.

- Registry writes require `KITCHEN_OPERATOR_API_KEY` outside local loopback.
- Agent write/reporting endpoints require per-agent bearer credentials minted by the registry.
- Memory read endpoints require operator authorization because they can expose sensitive context.
- Prefer Tailscale or a private LAN for multi-machine startup deployments.
- Use HTTPS and explicit operator keys for public or tunnel exposure.
- Treat agent cards as untrusted input. MemroOS validates URL policy, payload size, required fields, and registration authorization.

## Local URLs

- Landing page: `http://localhost:3000`
- Production-style local server: `http://localhost:3002`
- Memory UI: `/notebooks`
- Knowledge UI: `/library`
- Skills UI: `/cookbooks`
- Agent registry: `/agents`
- Engage / Dispatch UI: `/dispatch`
- Workflow Map UI: `/flow`
- A2A card: `/.well-known/agent-card.json`

## Development

```bash
npm run dev
npm run test
npm run lint
npm run build
npm run profiles:check
npm run first-run:check
npm run eval:memory-degradation
```

## Project Structure

```text
memroos/
├── apps/kitchen/              # Next.js UI and API routes
├── services/orchestration/    # Python LangGraph orchestration service
├── services/memory/           # mem0 service wrapper
├── services/knowledge-mcp/    # Knowledge/tool-attention MCP facade
├── services/voice-server/     # Optional voice service
├── config/                    # Operating profiles
├── docker/                    # Service Dockerfiles
├── docs/                      # User and architecture docs
├── scripts/                   # Setup and validation scripts
└── data/                      # Local SQLite state, gitignored
```

## Docs

- [Architecture](docs/architecture.md)
- [Install profiles](docs/install-profiles.md)
- [REST API reference](docs/rest-api.md)
- [Memory architecture](docs/memory-architecture.md)
- [Claude Code integration](docs/integrations/claude-code.md)
- [Google ADK integration](docs/integrations/google-adk.md)
- [LangGraph integration](docs/integrations/langgraph.md)
- [MemroOS MCP server](docs/integrations/mcp.md)
- [CrewAI and AutoGen integration](docs/integrations/crewai-autogen.md)

## Roadmap

Near-term focus after `v0.1.0`:

- Cleaner first-run onboarding for non-localhost deployments.
- Stronger memory-consumption evidence in dispatch and agent run records.
- More A2A compatibility fixtures and interop tests.
- More adapters for popular agent runtimes.
- Hardened production profile examples for Tailscale, Docker, and HTTPS reverse proxies.
- Iris secure dispatch gate for prompt-injection checks, tool-call validation, and post-execution output scanning.

## Contributing

This project is early, but useful contributions are welcome.

Start with [CONTRIBUTING.md](CONTRIBUTING.md) for setup, branch, pull request, and verification expectations. Please also read [SECURITY.md](SECURITY.md) before reporting security issues or sharing logs from agent runs.

Good first contribution areas:

- Add an adapter for an agent framework you use.
- Improve setup docs for your deployment shape.
- Add A2A compatibility fixtures.
- Improve memory search and source attribution.
- Improve security tests around registry writes and memory reads.

If MemroOS helps you stop making every agent start from zero, please star the repo. It helps the project find people building the same useful future.

## License

MemroOS is distributed under the [PolyForm Small Business License 1.0.0](LICENSE). Small businesses that meet the license thresholds may use it under those terms. Larger commercial use requires a separate commercial license. See [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md).

Agent Kitchen versions up to the `agent-kitchen-mit-final` tag were distributed under the MIT License. Those earlier MIT rights remain governed by those earlier terms. The current license applies to MemroOS copies and contributions after the license-change commit.
