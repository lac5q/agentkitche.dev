#!/usr/bin/env bash
# launchd entrypoint for agentkitche.dev.
# Runs the real Next server as the launchd-tracked process. Avoid npm wrapper
# chains here: if next-server exits but npm survives, launchd thinks Kitchen is
# still healthy while nothing is listening on :3002.

set -u
PORT="${PORT:-3002}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$REPO_DIR/logs"
mkdir -p "$LOG_DIR"

# Preflight: if something already listens on $PORT, log and exit 1.
# Exit 1 (error) so launchd's ThrottleInterval=60 kicks in and retries after 60s,
# by which time the old socket's TIME_WAIT will have expired and the port will be free.
# Do NOT exit 0 — that tells launchd it was a clean exit and it won't retry.
if existing_pid=$(lsof -ti "tcp:$PORT" -sTCP:LISTEN 2>/dev/null | head -1); then
  if [ -n "$existing_pid" ]; then
    cmd=$(ps -o command= -p "$existing_pid" 2>/dev/null | head -1)
    printf '[%s] preflight: port %s already held by pid %s (%s) — exiting 1 (retry in 60s)\n' \
      "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$PORT" "$existing_pid" "$cmd" \
      | tee -a "$LOG_DIR/launchd.log" >&2
    exit 1
  fi
fi

cd "$REPO_DIR"
exec /opt/homebrew/bin/node "$REPO_DIR/node_modules/next/dist/bin/next" start "$REPO_DIR/apps/kitchen" --port "$PORT"
