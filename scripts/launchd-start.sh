#!/usr/bin/env bash
# launchd entrypoint for MemroOS.
# Runs the real Next server as the launchd-tracked process. Avoid npm wrapper
# chains here: if next-server exits but npm survives, launchd thinks Kitchen is
# still healthy while nothing is listening on :3002.

set -u
PORT="${PORT:-3002}"
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="$REPO_DIR/logs"
mkdir -p "$LOG_DIR"
NODE_BIN="${KITCHEN_NODE_BIN:-}"
if [ -z "$NODE_BIN" ]; then
  if [ -x /opt/homebrew/opt/node@22/bin/node ]; then
    NODE_BIN=/opt/homebrew/opt/node@22/bin/node
  else
    NODE_BIN=/opt/homebrew/bin/node
  fi
fi

# Preflight 1: stale scheduler lock.
# instrumentation.ts uses an O_EXCL lockfile to ensure only one kitchen process
# runs the in-process schedulers. The release handler is on `process.on('exit')`,
# which does NOT fire on SIGKILL (used by the watchdog when the event loop wedges).
# A stale lock owned by a long-dead pid blocks new boots from starting schedulers,
# and in observed incidents has correlated with full boot wedges. Reap it here.
LOCK_PATH="${KITCHEN_SCHEDULER_LOCK:-$HOME/.agent-kitchen/run/scheduler.lock}"
if [ -f "$LOCK_PATH" ]; then
  lock_pid=$(cat "$LOCK_PATH" 2>/dev/null | tr -d '[:space:]')
  if [ -n "$lock_pid" ] && ! kill -0 "$lock_pid" 2>/dev/null; then
    rm -f "$LOCK_PATH"
    printf '[%s] preflight: removed stale scheduler.lock (dead pid %s)\n' \
      "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$lock_pid" \
      | tee -a "$LOG_DIR/launchd.log" >&2
  fi
fi

# Preflight 2: if something already listens on $PORT, log and exit 1.
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

printf '[%s] preflight: clean — exec next start on port %s\n' \
  "$(date '+%Y-%m-%dT%H:%M:%S%z')" "$PORT" >> "$LOG_DIR/launchd.log"

cd "$REPO_DIR"
exec "$NODE_BIN" "$REPO_DIR/node_modules/next/dist/bin/next" start "$REPO_DIR/apps/kitchen" --port "$PORT"
