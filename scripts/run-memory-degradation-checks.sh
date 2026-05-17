#!/usr/bin/env bash
# Regression checks for memory degradation visibility.
# Covers UI/API status, mem0 queue degradation, launchd monitor config, and shell syntax.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"
PYTHON_BIN="${PYTHON_BIN:-$ROOT_DIR/.venv/bin/python3}"
if [ ! -x "$PYTHON_BIN" ]; then
  PYTHON_BIN="$(command -v python3)"
fi

echo "[memory-degradation] checking shell and launchd configs"
bash -n services/memory/healthcheck.sh
node scripts/install-memory-resilience.mjs check

echo "[memory-degradation] checking mem0 queue and health degradation"
"$PYTHON_BIN" -m pytest services/memory/tests/test_mem0_queue.py

echo "[memory-degradation] checking Memroos memory health UI/API"
npm --prefix apps/memroos run test -- --run \
  src/app/api/health/__tests__/route.test.ts \
  src/app/api/memory/__tests__/tier-routes.test.ts \
  src/components/ledger/__tests__/memory-intelligence-panel.test.tsx

echo "[memory-degradation] complete"
