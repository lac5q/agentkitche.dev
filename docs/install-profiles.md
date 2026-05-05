# Install Profiles

Agent Kitchen supports multiple operating profiles so teams can start locally and grow into multi-machine or cloud deployments without rewriting code.

Profiles live in `config/operating-profiles.json` and are selected with `KITCHEN_A2A_PROFILE`.

## Quick Profile Table

| Profile | Best for | Network | Auth expectation |
| --- | --- | --- | --- |
| `local-dev` | One developer laptop | `localhost` | Loopback writes allowed if no operator key is set |
| `single-host` | One server or VM | Host-local/private | Operator key required |
| `private-network` | Startup multi-machine default | Tailscale or LAN | Operator key required |
| `cloud-https` | Internet-reachable Kitchen | HTTPS | Operator key required |
| `custom` | Non-standard topology | Operator-defined | Operator-defined |

## Recommended Startup Setup

Use `private-network` when agents run on different machines.

```env
KITCHEN_A2A_PROFILE=private-network
KITCHEN_PUBLIC_BASE_URL=http://kitchen.tailnet:3000
KITCHEN_A2A_ENDPOINT_BASE_URL=http://kitchen.tailnet:3000
KITCHEN_OPERATOR_API_KEY=<strong-random-secret>
```

Run:

```bash
./setup.sh --wizard
./setup.sh
```

## Local Development

Use `local-dev` when everything is on one machine.

```env
KITCHEN_A2A_PROFILE=local-dev
KITCHEN_PUBLIC_BASE_URL=http://localhost:3000
KITCHEN_A2A_ENDPOINT_BASE_URL=http://localhost:3000
```

Local loopback can register agents without `KITCHEN_OPERATOR_API_KEY`, but setting one is still safer and closer to production.

## Cloud HTTPS

Use `cloud-https` when Kitchen is reachable from the public internet.

```env
KITCHEN_A2A_PROFILE=cloud-https
KITCHEN_PUBLIC_BASE_URL=https://kitchen.example.com
KITCHEN_A2A_ENDPOINT_BASE_URL=https://kitchen.example.com
KITCHEN_OPERATOR_API_KEY=<strong-random-secret>
```

Put Kitchen behind a reverse proxy or tunnel that terminates HTTPS. Do not expose a cloud deployment without an operator key.

## Required Services

- Kitchen Next.js app
- mem0 service
- Qdrant Cloud
- Neo4j
- LangGraph orchestration service
- Optional voice service
- Optional knowledge MCP service

`docker-compose.yml` starts the local service stack. Qdrant remains cloud-only and is configured through environment variables.

## Environment Validation

```bash
npm run profiles:check
npm run first-run:check
```

`setup.sh` validates required tools, copies `.env.example` when needed, validates the selected profile, checks Qdrant unless `SKIP_QDRANT_CHECK=1`, and starts Docker Compose unless `START_SERVICES=0`.

## Common Confusion: Registry Has Fewer Agents Than Expected

The `/agents` page shows canonical registry agents only. Older `agents.config.json` entries are legacy remote poll targets. To make those agents first-class in Kitchen, register them through `/api/agents/register` or ingest their A2A card through `/api/a2a/agents/register`.
