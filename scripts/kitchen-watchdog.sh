#!/bin/bash
# Hang watchdog for com.agent-kitchen.
#
# launchd's KeepAlive only catches exit/crash, not a wedged-but-listening
# process (see the 2026-05-08 incident: PID stayed up 2.5 days serving zero
# requests). This pings `/` each minute; after THRESHOLD consecutive failures
# it SIGKILLs the supervised PID, and launchd's KeepAlive { Crashed: true }
# respawns it.
#
# Safeguards (added after the 2026-05-10 storm where the watchdog killed three
# fresh PIDs in a row that just hadn't bound the port yet):
#  - Grace period: skip checks for the first GRACE_SECS of process lifetime.
#  - Storm cap: refuse to kill if we've already killed >= MAX_KILLS_PER_HOUR.
#  - Probe `/` not `/api/health` — the latter is a downstream-services
#    aggregator (mem0/RTK/QMD) and can be slow even when Next is healthy.

set -u

STATE=/tmp/kitchen-watchdog.fails
KILL_LOG=/tmp/kitchen-watchdog.kills   # newline-separated unix timestamps
LOG=/Users/lcalderon/github/agent-kitchen/logs/watchdog.log
LABEL=com.agent-kitchen
URL=http://localhost:3002/
TIMEOUT=5
THRESHOLD=3
GRACE_SECS=120
MAX_KILLS_PER_HOUR=4

PID=$(launchctl list | awk -v l="$LABEL" '$3==l{print $1}')
if [ -z "$PID" ] || [ "$PID" = "-" ]; then
  # Not running — launchd owns the respawn decision, nothing to do.
  echo 0 > "$STATE" 2>/dev/null || true
  exit 0
fi

# Grace period: don't probe a process that just started. ps(1) etime is in
# elapsed-seconds form when shorter than a day.
etime_secs=$(ps -o etime= -p "$PID" 2>/dev/null | awk '
  {
    gsub(/^[ \t]+/, "");
    n = split($0, a, "-");
    days = 0; rest = $0;
    if (n == 2) { days = a[1]; rest = a[2]; }
    n2 = split(rest, b, ":");
    if (n2 == 3) { print days*86400 + b[1]*3600 + b[2]*60 + b[3]; }
    else if (n2 == 2) { print days*86400 + b[1]*60 + b[2]; }
    else { print days*86400 + b[1]; }
  }')
if [ -n "$etime_secs" ] && [ "$etime_secs" -lt "$GRACE_SECS" ]; then
  echo 0 > "$STATE"
  exit 0
fi

code=$(curl -sS -m "$TIMEOUT" -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null || echo 000)

if [ "$code" = "200" ] || [ "$code" = "301" ] || [ "$code" = "302" ] || [ "$code" = "307" ] || [ "$code" = "308" ]; then
  echo 0 > "$STATE"
  exit 0
fi

prev=$(cat "$STATE" 2>/dev/null || echo 0)
fails=$((prev + 1))
echo "$fails" > "$STATE"
echo "[$(date -Iseconds)] health=$code fails=$fails/$THRESHOLD pid=$PID etime=${etime_secs}s" >> "$LOG"

if [ "$fails" -lt "$THRESHOLD" ]; then
  exit 0
fi

# Storm cap: count kills in the last hour from KILL_LOG.
now=$(date +%s)
hour_ago=$((now - 3600))
recent_kills=0
if [ -f "$KILL_LOG" ]; then
  # Drop lines older than 1h, count the rest.
  tmp=$(mktemp)
  awk -v cutoff="$hour_ago" '$1 >= cutoff' "$KILL_LOG" > "$tmp" && mv "$tmp" "$KILL_LOG"
  recent_kills=$(wc -l < "$KILL_LOG" | tr -d ' ')
fi

if [ "$recent_kills" -ge "$MAX_KILLS_PER_HOUR" ]; then
  echo "[$(date -Iseconds)] STORM CAP: $recent_kills kills in last hour, refusing to SIGKILL pid=$PID — operator intervention required" >> "$LOG"
  # Don't reset fails — keep logging the wedge so the rate-of-fail is visible.
  exit 0
fi

echo "[$(date -Iseconds)] threshold reached, SIGKILL pid=$PID (kills_last_hour=$recent_kills)" >> "$LOG"
kill -9 "$PID" 2>/dev/null
echo "$now" >> "$KILL_LOG"
echo 0 > "$STATE"
