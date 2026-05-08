#!/bin/bash
# Persistent SSH tunnel to Vast.ai embedding service
# Usage: ./vast-embed-tunnel.sh [start|stop|status]

PID_FILE="/tmp/vast-embed-tunnel.pid"
LOCAL_PORT=8001
REMOTE_PORT=8000
SSH_PORT=12960
SSH_HOST="ssh6.vast.ai"
SSH_USER="root"

start() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "Tunnel already running (PID: $PID) on port $LOCAL_PORT"
            return
        fi
        rm -f "$PID_FILE"
    fi
    
    echo "Starting SSH tunnel on port $LOCAL_PORT -> $SSH_HOST:$REMOTE_PORT..."
    ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
        -p "$SSH_PORT" -N -L "$LOCAL_PORT:localhost:$REMOTE_PORT" \
        "$SSH_USER@$SSH_HOST" &
    echo $! > "$PID_FILE"
    echo "Tunnel started (PID: $(cat $PID_FILE))"
    sleep 2
    curl -s "http://localhost:$LOCAL_PORT/v1/models" | python3 -c "import json, sys; data = json.load(sys.stdin); print('Connected to:', data['data'][0]['id'])" 2>/dev/null || echo "Waiting for connection..."
}

stop() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        kill "$PID" 2>/dev/null && echo "Tunnel stopped (PID: $PID)" || echo "Tunnel already stopped"
        rm -f "$PID_FILE"
    else
        echo "No tunnel running"
    fi
}

status() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if kill -0 "$PID" 2>/dev/null; then
            echo "Tunnel running (PID: $PID) on port $LOCAL_PORT"
            curl -s "http://localhost:$LOCAL_PORT/v1/models" 2>/dev/null || echo "  (not responding)"
        else
            echo "Tunnel PID file exists but process not running"
            rm -f "$PID_FILE"
        fi
    else
        echo "No tunnel running"
    fi
}

case "${1:-start}" in
    start) start ;;
    stop) stop ;;
    status) status ;;
    *) echo "Usage: $0 {start|stop|status}" ;;
esac
