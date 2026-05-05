# Google ADK Integration

Google ADK is the first compatibility proof for Kitchen's A2A path. The goal is runnable interoperability, not docs-only compatibility.

## Recommended Path

1. Start the ADK agent server.
2. Confirm it exposes an A2A-compatible agent card.
3. Register the card with Kitchen.
4. Send tasks through Kitchen's A2A broker.

```bash
curl -X POST http://localhost:3000/api/a2a/agents/register \
  -H 'Content-Type: application/json' \
  -H 'x-kitchen-operator-key: <operator-key>' \
  -d '{
    "cardUrl": "http://localhost:8001/a2a/check_prime_agent/.well-known/agent-card.json",
    "source": "adk",
    "requestedId": "check-prime-agent"
  }'
```

## Send A Message

```bash
curl -X POST http://localhost:3000/message:send \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <agent-api-key>' \
  -d '{
    "targetAgentId": "check-prime-agent",
    "message": {
      "role": "user",
      "parts": [{ "kind": "text", "text": "Is 2147483647 prime?" }]
    }
  }'
```

## Streaming

```bash
curl -N -X POST http://localhost:3000/message:stream \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer <agent-api-key>' \
  -d '{
    "targetAgentId": "check-prime-agent",
    "message": {
      "role": "user",
      "parts": [{ "kind": "text", "text": "Show your task state." }]
    }
  }'
```

Kitchen returns SSE `task.update` events and stores task state durably.

## Compatibility Expectations

- Use the current A2A card and task lifecycle routes, not stale `tasks/send` wording.
- Keep the ADK fixture runnable in CI or local smoke where possible.
- Bind the ADK identity to the canonical registry entry.
- Use bearer credentials issued by Kitchen for write/reporting operations.
