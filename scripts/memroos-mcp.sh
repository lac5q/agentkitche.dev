#!/usr/bin/env bash
# Launch Memroos' knowledge/tool-attention MCP facade.
# Keep stdout clean for MCP JSON-RPC; all setup/status messages go to stderr.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

export MEMROOS_ROOT="${MEMROOS_ROOT:-$ROOT}"

if [[ -z "${KNOWLEDGE_ROOT:-}" ]]; then
  if [[ -d "$HOME/github/knowledge" ]]; then
    export KNOWLEDGE_ROOT="$HOME/github/knowledge"
  else
    export KNOWLEDGE_ROOT="$MEMROOS_ROOT"
  fi
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stdio)
      export MEMROOS_MCP_TRANSPORT="stdio"
      shift
      ;;
    --http|--streamable-http)
      export MEMROOS_MCP_TRANSPORT="streamable-http"
      shift
      ;;
    --sse)
      export MEMROOS_MCP_TRANSPORT="sse"
      shift
      ;;
    --host)
      export MEMROOS_MCP_HOST="${2:?--host requires a value}"
      shift 2
      ;;
    --port)
      export MEMROOS_MCP_PORT="${2:?--port requires a value}"
      shift 2
      ;;
    --path|--mcp-path)
      export MEMROOS_MCP_STREAMABLE_HTTP_PATH="${2:?--path requires a value}"
      shift 2
      ;;
    --knowledge-root)
      export KNOWLEDGE_ROOT="${2:?--knowledge-root requires a value}"
      shift 2
      ;;
    --mem0-url)
      export MEM0_URL="${2:?--mem0-url requires a value}"
      shift 2
      ;;
    --stateless-http)
      export MEMROOS_MCP_STATELESS_HTTP="true"
      shift
      ;;
    --help|-h)
      cat >&2 <<'HELP'
Usage: scripts/memroos-mcp.sh [--stdio|--http|--sse] [options]

Defaults to stdio for local MCP clients.

Options:
  --http                  Serve Streamable HTTP MCP (default path /mcp)
  --sse                   Serve legacy SSE MCP
  --host HOST             Bind host for HTTP/SSE, e.g. 0.0.0.0 for Tailscale
  --port PORT             Bind port for HTTP/SSE, default 8765
  --path PATH             Streamable HTTP path, default /mcp
  --knowledge-root PATH   Knowledge root to expose; defaults to ~/github/knowledge if present, else repo root
  --mem0-url URL          mem0 base URL for memory_search/memory_save
  --stateless-http        Enable FastMCP stateless HTTP mode

Examples:
  scripts/memroos-mcp.sh
  scripts/memroos-mcp.sh --http --host 0.0.0.0 --port 8765
HELP
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 2
      ;;
  esac
done

PYTHON="${KNOWLEDGE_PYTHON:-}"
if [[ -z "$PYTHON" ]]; then
  if [[ -x "$MEMROOS_ROOT/.venv/bin/python" ]]; then
    PYTHON="$MEMROOS_ROOT/.venv/bin/python"
  elif [[ -x "$HOME/github/knowledge/.venv/bin/python" ]]; then
    PYTHON="$HOME/github/knowledge/.venv/bin/python"
  else
    python3 -m venv "$MEMROOS_ROOT/.venv" >&2
    PYTHON="$MEMROOS_ROOT/.venv/bin/python"
  fi
fi

if ! "$PYTHON" - <<'PY' >/dev/null 2>&1
try:
    import fastmcp  # noqa: F401
except Exception:
    import mcp.server.fastmcp  # noqa: F401
import httpx  # noqa: F401
import yaml  # noqa: F401
PY
then
  "$PYTHON" -m pip install -q -r "$MEMROOS_ROOT/services/knowledge-mcp/requirements.txt" >&2
fi

exec "$PYTHON" "$MEMROOS_ROOT/services/knowledge-mcp/knowledge_system/mcp_server.py"
