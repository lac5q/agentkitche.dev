#!/usr/bin/env bash
# Backward-compatible entrypoint for configs that still use the old Agent Kitchen name.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec "$SCRIPT_DIR/memroos-mcp.sh" "$@"
