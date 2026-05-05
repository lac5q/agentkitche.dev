# REST API Reference

This reference covers the stable v2 integration surface. UI-only read endpoints exist, but external agents should prefer the registry, A2A, memory, heartbeat, and skill report endpoints below.

## Authentication

Operator writes use either header:

```text
x-kitchen-operator-key: <KITCHEN_OPERATOR_API_KEY>
```

or:

```text
Authorization: Bearer <KITCHEN_OPERATOR_API_KEY>
```

Agent writes use:

```text
Authorization: Bearer <agent-api-key>
```

Agent API keys are minted by `/api/agents/register` or `/api/a2a/agents/register` when `issueApiKey` is true or omitted.

## Registry

### `GET /api/agents`

Lists canonical registry agents.

Response:

```json
{
  "agents": [],
  "timestamp": "2026-05-05T00:00:00.000Z"
}
```

### `POST /api/agents/register`

Registers a REST, A2A, UI, or local agent. Requires operator auth outside loopback.

Request:

```json
{
  "id": "worker-1",
  "name": "Worker 1",
  "role": "Research agent",
  "platform": "codex",
  "protocol": "rest",
  "location": "tailscale",
  "host": "100.64.0.10",
  "port": 8787,
  "healthEndpoint": "/health",
  "capabilities": [
    { "id": "research", "name": "Research", "description": "Researches bounded tasks", "tags": ["research"] }
  ]
}
```

Response:

```json
{
  "ok": true,
  "agent": { "id": "worker-1" },
  "apiKey": "generated-agent-key",
  "timestamp": "2026-05-05T00:00:00.000Z"
}
```

### `GET /api/agents/{id}`

Returns one canonical registry agent.

### `DELETE /api/agents/{id}`

Soft-deletes an agent and revokes active keys. Requires operator auth.

### `GET /api/agents/cards`

Returns A2A cards for registered agents that can be represented as cards.

### `GET /api/agents/{id}/card`

Returns one registered agent's A2A card projection.

## A2A Registration

### `POST /api/a2a/agents/register`

Ingests a remote A2A agent card into the canonical registry. Requires operator auth.

Request:

```json
{
  "cardUrl": "http://agent.tailnet:8000/.well-known/agent-card.json",
  "source": "a2a",
  "requestedId": "research-agent",
  "issueApiKey": true
}
```

## A2A Protocol Endpoints

### `GET /.well-known/agent-card.json`

Kitchen's canonical A2A card.

### `GET /.well-known/agent.json`

Compatibility alias for clients that still look for the older path.

### `POST /a2a`

JSON-RPC endpoint. Supports Kitchen's current A2A task methods for sending messages, listing tasks, fetching tasks, and canceling tasks.

### `POST /message:send`

Creates a durable task from an authenticated A2A caller.

### `POST /message:stream`

Creates a task and returns SSE `task.update` events.

### `GET /tasks`

Lists tasks visible to the authenticated agent.

### `GET /tasks/{id}`

Fetches one task visible to the authenticated agent.

### `POST /tasks/{id}:cancel`

Cancels a non-terminal task visible to the authenticated agent.

### `POST /tasks/{id}:subscribe`

Returns task state and stored events as SSE `task.update` events.

## Agent Runtime Reporting

### `POST /api/heartbeat`

Requires agent bearer auth.

Request:

```json
{
  "agentId": "worker-1",
  "status": "active",
  "currentTask": "Indexing docs",
  "latencyMs": 42,
  "metadata": { "machine": "mac-mini-1" }
}
```

### `POST /api/memory/add`

Requires agent bearer auth. Writes through mem0 and records the write in Kitchen.

Request:

```json
{
  "agentId": "worker-1",
  "content": "The deployment target is private-network over Tailscale.",
  "metadata": { "topic": "deployment" },
  "tier": "vector"
}
```

Tier may be `vector`, `graph`, or `episodic`; the router also infers tier from metadata when possible.

### `POST /api/skills/report`

Requires agent bearer auth.

Request:

```json
{
  "agentId": "worker-1",
  "skillId": "code-review",
  "action": "completed",
  "metadata": { "findings": 2 }
}
```

## Memory Read Endpoints

These require operator authorization because they can expose sensitive memory.

### `GET /api/memory/search?q=agent&limit=10`

Searches vector memory.

### `GET /api/memory/graph?q=Luis&limit=25`

Queries graph memory.

### `GET /api/memory/health`

Returns vector, graph, and episodic tier health.

## Orchestration

### `POST /api/orchestration`

Requires operator auth. Sends a task to the LangGraph orchestration service with registered agents as routing candidates.

Request:

```json
{
  "taskSummary": "Research A2A compatibility and propose an implementation plan",
  "requiredCapability": "research",
  "requiresApproval": true,
  "correlationId": "phase-40-docs"
}
```

### `GET /api/orchestration/hil`

Lists pending human-in-the-loop decisions. Requires operator auth.

### `POST /api/orchestration/hil/{id}`

Resolves one HIL decision. Requires operator auth.

```json
{ "decision": "approve" }
```
