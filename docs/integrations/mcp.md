# agentkitchen.dev as an MCP Server

agentkitchen.dev exposes a small MCP facade named `agentkitchen` for knowledge, memory, and progressive tool discovery. It supports both:

- **stdio**: best when the MCP client runs on the same machine or has a local clone.
- **Streamable HTTP**: best for Maria/Sophia or any agent on another machine over Tailscale/LAN.

The server entry point is:

```bash
scripts/agentkitchen-mcp.sh
```

It keeps stdout clean for MCP JSON-RPC, installs missing Python MCP dependencies into `.venv` if needed, and defaults `KNOWLEDGE_ROOT` to `~/github/knowledge` when present.

## Option A — local stdio client

Use this when the agent client can run commands on the same filesystem as the agentkitchen.dev clone.

```json
{
  "mcpServers": {
    "agentkitchen": {
      "command": "/bin/bash",
      "args": [
        "-lc",
        "exec \"${AGENT_KITCHEN_ROOT:-$HOME/github/agentkitchen.dev}/scripts/agentkitchen-mcp.sh\""
      ]
    }
  }
}
```

For Hermes, the equivalent config is:

```yaml
mcp_servers:
  agentkitchen:
    command: /bin/bash
    args:
      - -lc
      - exec "${AGENT_KITCHEN_ROOT:-$HOME/github/agentkitchen.dev}/scripts/agentkitchen-mcp.sh"
```

## Option B — remote Streamable HTTP client

Use this when Maria/Sophia are on a different machine.

On the agentkitchen.dev host:

```bash
cd ~/github/agentkitchen.dev
npm run mcp:http
# or: ./scripts/agentkitchen-mcp.sh --http --host 0.0.0.0 --port 8765
```

Then on Maria/Sophia's machine, add:

```json
{
  "mcpServers": {
    "agentkitchen": {
      "url": "http://<kitchen-tailscale-host-or-ip>:8765/mcp"
    }
  }
}
```

For Hermes on Maria/Sophia's machine:

```yaml
mcp_servers:
  agentkitchen:
    url: http://<kitchen-tailscale-host-or-ip>:8765/mcp
```

Replace `<kitchen-tailscale-host-or-ip>` with the Kitchen machine's Tailscale DNS name or 100.x Tailscale IP.

## ChatGPT connector server

ChatGPT custom connectors and Deep Research-compatible MCP servers need read-only `search` and `fetch` tools. The Agent Kitchen MCP facade includes those tools alongside the richer knowledge, memory, and tool-attention tools.

For the easy macOS setup, install the HTTP MCP facade as a LaunchAgent:

```bash
cd ~/github/agentkitchen.dev
KITCHEN_MCP_PUBLIC_BASE_URL=https://kitchen.example npm run install:mcp:chatgpt
```

The installer writes `~/Library/LaunchAgents/com.agentkitchen.chatgpt-mcp.plist`, keeps the server alive on port `8765`, and prints the connector URL:

```text
https://kitchen.example/mcp
```

The installer also creates `~/.agent-kitchen/com.agentkitchen.chatgpt-mcp.env` with a generated `KITCHEN_MCP_BEARER_TOKEN` and `0600` permissions. HTTP clients must send:

```text
Authorization: Bearer <token>
```

ChatGPT web custom connectors support OAuth or no-auth remote MCP, not arbitrary static bearer-token setup. For public ChatGPT use, put this server behind an OAuth-capable access layer such as Cloudflare Access Managed OAuth, or expose a separate read-only public-safe MCP profile that contains only `search` and `fetch`.

Useful follow-up commands:

```bash
npm run install:mcp:chatgpt -- status
npm run install:mcp:chatgpt -- uninstall
tail -f /tmp/agentkitchen-chatgpt-mcp.log
```

There is also an editable plist template at `examples/mcp/com.agentkitchen.chatgpt-mcp.plist` for non-default LaunchAgent setups.

## Smoke tests

Local stdio config parse:

```bash
bash -n scripts/agentkitchen-mcp.sh
```

Remote HTTP server health via MCP initialize is easiest with an MCP-aware client, but a basic HTTP reachability check should return an MCP response rather than connection refused:

```bash
curl -i http://<kitchen-host>:8765/mcp
```

Expected: HTTP reaches the FastMCP endpoint. Some clients require a POST/session handshake, so a plain GET may return 405/406; that is still better than connection refused.

## Security notes

- Prefer Tailscale/private LAN. Do not expose this directly to the public internet.
- `memory_search` can reveal sensitive memory if the backing mem0 service is reachable; treat the HTTP MCP endpoint as trusted-internal only.
- For public/tunnel use, put it behind HTTPS and an auth proxy before sharing the URL.
