#!/usr/bin/env bash
# Install the MemroOS Streamable HTTP MCP server as a macOS LaunchAgent
# for ChatGPT custom connectors / Developer Mode.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LABEL="${MEMROOS_MCP_LABEL:-com.memroos.chatgpt-mcp}"
PORT="${MEMROOS_MCP_PORT:-8765}"
HOST="${MEMROOS_MCP_HOST:-0.0.0.0}"
PUBLIC_BASE_URL="${MEMROOS_MCP_PUBLIC_BASE_URL:-http://localhost:${PORT}}"
ACTION="install"

usage() {
  cat <<HELP
Usage: scripts/install-chatgpt-mcp-launchd.sh [install|status|uninstall] [options]

Options:
  --public-base-url URL   Public URL ChatGPT should cite, e.g. https://memroos.example
  --host HOST             Bind host for the MCP server, default ${HOST}
  --port PORT             Bind port for the MCP server, default ${PORT}
  --label LABEL           LaunchAgent label, default ${LABEL}
  --help                  Show this help

Examples:
  scripts/install-chatgpt-mcp-launchd.sh
  scripts/install-chatgpt-mcp-launchd.sh --public-base-url https://memroos.example
  scripts/install-chatgpt-mcp-launchd.sh status
  scripts/install-chatgpt-mcp-launchd.sh uninstall
HELP
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    install|status|uninstall)
      ACTION="$1"
      shift
      ;;
    --public-base-url)
      PUBLIC_BASE_URL="${2:?--public-base-url requires a value}"
      shift 2
      ;;
    --host)
      HOST="${2:?--host requires a value}"
      shift 2
      ;;
    --port)
      PORT="${2:?--port requires a value}"
      shift 2
      ;;
    --label)
      LABEL="${2:?--label requires a value}"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

PLIST_DIR="$HOME/Library/LaunchAgents"
PLIST_PATH="$PLIST_DIR/${LABEL}.plist"
LOG_PATH="/tmp/memroos-chatgpt-mcp.log"
DOMAIN="gui/$(id -u)"
TOKEN_FILE="$HOME/.memroos/${LABEL}.env"

shell_quote() {
  printf "%q" "$1"
}

ensure_token_file() {
  mkdir -p "$HOME/.memroos"
  chmod 700 "$HOME/.memroos"

  local token="${MEMROOS_MCP_BEARER_TOKEN:-}"
  if [[ -z "$token" && -f "$TOKEN_FILE" ]]; then
    token="$(sed -n 's/^MEMROOS_MCP_BEARER_TOKEN=//p' "$TOKEN_FILE" | tail -1)"
  fi
  if [[ -z "$token" ]]; then
    token="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
  fi

  umask 077
  {
    printf 'MEMROOS_MCP_BEARER_TOKEN=%s\n' "$token"
  } > "$TOKEN_FILE"
  chmod 600 "$TOKEN_FILE"
}

status() {
  if launchctl print "${DOMAIN}/${LABEL}" >/dev/null 2>&1; then
    launchctl print "${DOMAIN}/${LABEL}" | sed 's/MEMROOS_MCP_BEARER_TOKEN => .*/MEMROOS_MCP_BEARER_TOKEN => [redacted]/' | sed -n '1,80p'
  else
    echo "${LABEL} is not loaded"
    return 1
  fi
}

uninstall() {
  launchctl bootout "$DOMAIN" "$PLIST_PATH" >/dev/null 2>&1 || true
  rm -f "$PLIST_PATH"
  rm -f "$TOKEN_FILE"
  echo "Removed $PLIST_PATH"
  echo "Removed $TOKEN_FILE"
}

write_plist() {
  mkdir -p "$PLIST_DIR"
  local quoted_token_file quoted_root quoted_host quoted_port
  quoted_token_file="$(shell_quote "$TOKEN_FILE")"
  quoted_root="$(shell_quote "$ROOT")"
  quoted_host="$(shell_quote "$HOST")"
  quoted_port="$(shell_quote "$PORT")"
  local launch_command="set -a; if [ -f ${quoted_token_file} ]; then . ${quoted_token_file}; fi; set +a; exec ${quoted_root}/scripts/memroos-mcp.sh --http --host ${quoted_host} --port ${quoted_port}"

  cat > "$PLIST_PATH" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${LABEL}</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-lc</string>
        <string>${launch_command}</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>MEMROOS_ROOT</key>
        <string>${ROOT}</string>
        <key>MEMROOS_MCP_PUBLIC_BASE_URL</key>
        <string>${PUBLIC_BASE_URL}</string>
        <key>PATH</key>
        <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${LOG_PATH}</string>
    <key>StandardErrorPath</key>
    <string>${LOG_PATH}</string>
</dict>
</plist>
PLIST
  plutil -lint "$PLIST_PATH" >/dev/null
}

install_service() {
  ensure_token_file
  write_plist
  launchctl bootout "$DOMAIN" "$PLIST_PATH" >/dev/null 2>&1 || true
  launchctl bootstrap "$DOMAIN" "$PLIST_PATH"
  sleep 2
  status
  echo
  echo "MemroOS MCP is listening at http://localhost:${PORT}/mcp"
  echo "ChatGPT connector URL: ${PUBLIC_BASE_URL}/mcp"
  echo "Bearer token file: ${TOKEN_FILE}"
  echo "Logs: ${LOG_PATH}"
}

case "$ACTION" in
  install) install_service ;;
  status) status ;;
  uninstall) uninstall ;;
esac
