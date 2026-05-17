# LangGraph Integration

Memroos supports LangGraph in two ways:

1. LangGraph agents can register as A2A agents and receive tasks through Memroos.
2. Memroos can delegate routed tasks to the Python LangGraph orchestration service.

## LangGraph Agent as A2A Peer

Expose an A2A card for the LangGraph agent and register it:

```bash
curl -X POST http://localhost:3000/api/a2a/agents/register \
  -H 'Content-Type: application/json' \
  -H 'x-memroos-operator-key: <operator-key>' \
  -d '{
    "cardUrl": "http://langgraph-agent.tailnet:9000/.well-known/agent-card.json",
    "source": "a2a",
    "requestedId": "langgraph-researcher"
  }'
```

Use Memroos's `/message:send`, `/message:stream`, and `/tasks/*` endpoints for durable task lifecycle.

## Memroos to LangGraph Orchestration

Memroos proxies orchestration requests to `ORCHESTRATION_SERVICE_URL`.

```bash
curl -X POST http://localhost:3000/api/orchestration \
  -H 'Content-Type: application/json' \
  -H 'x-memroos-operator-key: <operator-key>' \
  -d '{
    "taskSummary": "Choose the best registered agent for this research task.",
    "requiredCapability": "research",
    "requiresApproval": true,
    "correlationId": "demo-langgraph-1"
  }'
```

The orchestration service owns:

- StateGraph routing.
- SqliteSaver checkpointing.
- Retry metadata.
- Human-in-the-loop approval state.

Memroos owns:

- Operator UI.
- Registry candidate list.
- Auth gate.
- HIL list/resolve proxy.

## Human Approval

List decisions:

```bash
curl -H 'x-memroos-operator-key: <operator-key>' \
  http://localhost:3000/api/orchestration/hil
```

Resolve a decision:

```bash
curl -X POST http://localhost:3000/api/orchestration/hil/<decision-id> \
  -H 'Content-Type: application/json' \
  -H 'x-memroos-operator-key: <operator-key>' \
  -d '{"decision":"approve"}'
```

## Boundary Rule

Do not move Memroos UI concerns into LangGraph. Do not move LangGraph checkpoint semantics into Memroos. The boundary is an HTTP orchestration contract.
