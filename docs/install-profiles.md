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

## Optional Progressive Capabilities

Kitchen can also check bundled-but-optional capabilities during setup:

```env
KITCHEN_OPTIONAL_CAPABILITIES=gitnexus,agent-lightning
```

Supported v1 values are `gitnexus` and `agent-lightning`. These checks only warn; they do not make setup fail. GitNexus stays discoverable through `.mcp.json` as `mcp-server:gitnexus`, and Agent Lightning/APO is surfaced as `capability:agent-lightning` in the progressive tool catalog.

The setup check intentionally does not install GitNexus, run GitNexus reindexing, install APO cron jobs, or apply APO proposals. It only reports whether the local machine is ready to use the optional capability and gives actionable warnings when paths, scripts, registries, or logs are missing.

Keep generated GitNexus indexes and APO proposal bodies out of memory. Use memory only for compact preferences and outcome lessons, such as which capability helped for a task type.

### GitNexus Boundary

Keep GitNexus as its own MCP server:

```json
{
  "mcpServers": {
    "gitnexus": {
      "command": "gitnexus",
      "args": ["mcp"]
    }
  }
}
```

Agent Kitchen reads that registration and advertises `mcp-server:gitnexus` through tool-attention. This keeps code graph indexing, stale-index checks, and repo intelligence in GitNexus while Kitchen stays the progressive discovery and operator-control layer.

### Agent Lightning Boundary

Agent Lightning/APO remains a human-gated proposal workflow. Kitchen surfaces it as `capability:agent-lightning`, reads proposal/log paths from the existing APO environment variables, and uses the existing worker command:

```bash
npm --prefix apps/kitchen run apo:worker -- --executor qwen
```

Approving proposals and processing the approved queue remain explicit operator actions.

## Common Confusion: Registry Has Fewer Agents Than Expected

The `/agents` page shows canonical registry agents only. Older `agents.config.json` entries are legacy remote poll targets. To make those agents first-class in Kitchen, register them through `/api/agents/register` or ingest their A2A card through `/api/a2a/agents/register`.
