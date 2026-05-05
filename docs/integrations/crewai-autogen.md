# CrewAI and AutoGen Integration

CrewAI and AutoGen agents should use the REST shim unless they expose A2A-compatible cards. This keeps integration simple while preserving Kitchen visibility.

## Register a REST Agent

```bash
curl -X POST http://localhost:3000/api/agents/register \
  -H 'Content-Type: application/json' \
  -H 'x-kitchen-operator-key: <operator-key>' \
  -d '{
    "id": "crewai-worker",
    "name": "CrewAI Worker",
    "role": "Research crew",
    "platform": "openclaw",
    "protocol": "rest",
    "location": "tailscale",
    "host": "crewai-worker.tailnet",
    "port": 8787,
    "healthEndpoint": "/health",
    "capabilities": [
      { "id": "research", "name": "Research", "description": "Researches assigned tasks", "tags": ["crew"] }
    ]
  }'
```

Use the returned `apiKey` as the agent bearer token.

## Python Heartbeat Example

```python
import requests

KITCHEN = "http://kitchen.tailnet:3000"
API_KEY = "agent-api-key"

requests.post(
    f"{KITCHEN}/api/heartbeat",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "agentId": "crewai-worker",
        "status": "active",
        "currentTask": "Drafting research brief",
        "metadata": {"framework": "crewai"},
    },
    timeout=5,
)
```

## Python Memory Example

```python
import requests

requests.post(
    f"{KITCHEN}/api/memory/add",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "agentId": "crewai-worker",
        "content": "The customer prefers private-network deployment before cloud HTTPS.",
        "tier": "vector",
        "metadata": {"framework": "crewai", "source": "task"},
    },
    timeout=5,
)
```

## Skill Report Example

```python
requests.post(
    f"{KITCHEN}/api/skills/report",
    headers={"Authorization": f"Bearer {API_KEY}"},
    json={
        "agentId": "crewai-worker",
        "skillId": "market-research",
        "action": "completed",
        "metadata": {"durationSeconds": 42},
    },
    timeout=5,
)
```

## Upgrade Path to A2A

When the framework can expose an A2A card, switch from `protocol: rest` registration to `/api/a2a/agents/register`. Keep the same logical agent ID when possible so historical Kitchen data remains easy to interpret.
