# ADK A2A Agent Fixture

This optional fixture proves the Memroos Phase 35 path: a Google ADK-shaped A2A agent exposes an agent card, Memroos ingests the card into the canonical registry, and Memroos can delegate tasks to the remote A2A endpoint.

## Install

```bash
pip install google-adk[a2a]
```

## Run The ADK A2A Server

From the repository root:

```bash
adk api_server --a2a --port 8001 examples/adk-a2a-agent
```

The fixture card URL used by Memroos is:

```bash
MEMROOS_A2A_ADK_FIXTURE_CARD_URL=http://localhost:8001/a2a/check_prime_agent/.well-known/agent-card.json
```

If your ADK runtime serves the card at the root well-known path instead, use:

```bash
MEMROOS_A2A_ADK_FIXTURE_CARD_URL=http://localhost:8001/.well-known/agent-card.json
```

## Register With Memroos

The registration endpoint is protected by the same operator/session gate as other registry writes. Include your normal Memroos operator auth/session when calling it.

```bash
curl -sS -X POST http://localhost:3000/api/a2a/agents/register \
  -H 'Content-Type: application/json' \
  -d '{"cardUrl":"http://localhost:8001/a2a/check_prime_agent/.well-known/agent-card.json","source":"adk"}'
```

For a Tailscale/LAN deployment, replace `localhost` with the reachable private-network host and keep bearer/API-key auth enabled. The fixture is not imported by Memroos startup and is safe to delete or replace with your real ADK agent.
