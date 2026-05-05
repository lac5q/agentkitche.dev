# ADK A2A Agent Fixture

This optional fixture proves the Kitchen Phase 35 path: a Google ADK-shaped A2A agent exposes an agent card, Kitchen ingests the card into the canonical registry, and Kitchen can delegate tasks to the remote A2A endpoint.

## Install

```bash
pip install google-adk[a2a]
```

## Run The ADK A2A Server

From the repository root:

```bash
adk api_server --a2a --port 8001 examples/adk-a2a-agent
```

The fixture card URL used by Kitchen is:

```bash
KITCHEN_A2A_ADK_FIXTURE_CARD_URL=http://localhost:8001/a2a/check_prime_agent/.well-known/agent-card.json
```

If your ADK runtime serves the card at the root well-known path instead, use:

```bash
KITCHEN_A2A_ADK_FIXTURE_CARD_URL=http://localhost:8001/.well-known/agent-card.json
```

## Register With Kitchen

The registration endpoint is protected by the same operator/session gate as other registry writes. Include your normal Kitchen operator auth/session when calling it.

```bash
curl -sS -X POST http://localhost:3000/api/a2a/agents/register \
  -H 'Content-Type: application/json' \
  -d '{"cardUrl":"http://localhost:8001/a2a/check_prime_agent/.well-known/agent-card.json","source":"adk"}'
```

For a Tailscale/LAN deployment, replace `localhost` with the reachable private-network host and keep bearer/API-key auth enabled. The fixture is not imported by Kitchen startup and is safe to delete or replace with your real ADK agent.
