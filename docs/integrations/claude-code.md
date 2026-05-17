# Claude Code Integration

Claude Code-style agents should use Memroos through A2A when they can expose a card, or through the REST shim when they only need reporting.

## Recommended Path: A2A

1. Run the Claude Code agent on the same host, Tailscale, or trusted LAN.
2. Expose an A2A card at `/.well-known/agent-card.json`.
3. Register the card with Memroos.

```bash
curl -X POST http://localhost:3000/api/a2a/agents/register \
  -H 'Content-Type: application/json' \
  -H 'x-memroos-operator-key: <operator-key>' \
  -d '{
    "cardUrl": "http://claude-agent.tailnet:8787/.well-known/agent-card.json",
    "source": "a2a",
    "requestedId": "claude-worker"
  }'
```

## REST Reporting Path

If the agent does not expose A2A yet, register it as REST:

```bash
curl -X POST http://localhost:3000/api/agents/register \
  -H 'Content-Type: application/json' \
  -H 'x-memroos-operator-key: <operator-key>' \
  -d '{
    "id": "claude-worker",
    "name": "Claude Worker",
    "role": "Implementation agent",
    "platform": "claude",
    "protocol": "rest",
    "location": "tailscale",
    "host": "claude-worker.tailnet",
    "port": 8787,
    "healthEndpoint": "/health"
  }'
```

Then report heartbeat:

```bash
curl -X POST http://localhost:3000/api/heartbeat \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <agent-api-key>' \
  -d '{"agentId":"claude-worker","status":"active","currentTask":"Running tests"}'
```

## Memory Reporting

```bash
curl -X POST http://localhost:3000/api/memory/add \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <agent-api-key>' \
  -d '{
    "agentId": "claude-worker",
    "content": "The repo uses Phase 34 canonical registry for /agents.",
    "tier": "vector",
    "metadata": { "source": "claude-code" }
  }'
```

## Notes

- The `/agents` UI shows only canonical registry agents, not raw Claude memory folders.
- File-backed Claude memory paths are still useful for notebooks/memory views, but they are not registry identity.
- Prefer Tailscale/private-network URLs for multi-machine startup use.
