#!/usr/bin/env bash
set -euo pipefail

PROFILE="${KITCHEN_A2A_PROFILE:-local-dev}"
START_SERVICES="${START_SERVICES:-1}"
ENV_FILE="${ENV_FILE:-.env}"
ENV_CREATED=0
INSTALL_MEMORY_RESILIENCE_OVERRIDE="${INSTALL_MEMORY_RESILIENCE:-}"

if [[ "${1:-}" == "--wizard" ]]; then
  node scripts/first-run-wizard.mjs
  exit 0
fi

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing prerequisite: $1" >&2
    exit 1
  fi
}

copy_env_if_missing() {
  if [[ ! -f "$ENV_FILE" ]]; then
    cp .env.example "$ENV_FILE"
    ENV_CREATED=1
    echo "Created $ENV_FILE from .env.example. Update API keys before starting cloud-backed services."
  fi
}

load_env() {
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
}

require_env() {
  local key="$1"
  local value="${!key:-}"
  if [[ -z "$value" || "$value" == your-* || "$value" == change-me ]]; then
    echo "Required env $key is not configured in $ENV_FILE" >&2
    exit 1
  fi
}

validate_profile() {
  node scripts/validate-operating-profiles.mjs
  if ! node -e "const p=require('./config/operating-profiles.json'); process.exit(p.profiles['$PROFILE'] ? 0 : 1)"; then
    echo "Unknown KITCHEN_A2A_PROFILE=$PROFILE" >&2
    exit 1
  fi
}

validate_qdrant() {
  require_env QDRANT_URL
  require_env QDRANT_API_KEY
  if [[ "${SKIP_QDRANT_CHECK:-0}" == "1" ]]; then
    echo "SKIP_QDRANT_CHECK=1, skipping live Qdrant Cloud validation."
    return
  fi
  python3 - <<'PY'
import os
import sys
import urllib.request

url = os.environ["QDRANT_URL"].rstrip("/") + "/collections"
req = urllib.request.Request(url, headers={"api-key": os.environ["QDRANT_API_KEY"]})
try:
    with urllib.request.urlopen(req, timeout=5) as response:
        if response.status >= 400:
            raise RuntimeError(f"HTTP {response.status}")
except Exception as exc:
    print(f"Qdrant Cloud validation failed: {exc}", file=sys.stderr)
    print("Check QDRANT_URL and QDRANT_API_KEY in your env file.", file=sys.stderr)
    sys.exit(1)
PY
}

validate_optional_capabilities() {
  if [[ -z "${KITCHEN_OPTIONAL_CAPABILITIES:-}" ]]; then
    return
  fi
  node scripts/optional-capabilities.mjs
}

install_memory_resilience() {
  if [[ "${INSTALL_MEMORY_RESILIENCE:-1}" == "0" ]]; then
    echo "INSTALL_MEMORY_RESILIENCE=0, skipping memory resilience monitor install."
    return
  fi
  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "Memory resilience launchd jobs are macOS-only; skipping."
    return
  fi
  node scripts/install-memory-resilience.mjs install
}

start_services() {
  if [[ "$START_SERVICES" == "0" ]]; then
    echo "START_SERVICES=0, skipping docker compose up."
    return
  fi
  docker compose up -d
}

main() {
  need node
  need npm
  need python3
  need docker
  docker compose version >/dev/null

  copy_env_if_missing
  if [[ "$ENV_CREATED" == "1" || "${RUN_FIRST_RUN_WIZARD:-0}" == "1" ]]; then
    echo "Tip: run ./setup.sh --wizard for guided first-run configuration."
  fi
  load_env
  if [[ -n "$INSTALL_MEMORY_RESILIENCE_OVERRIDE" ]]; then
    INSTALL_MEMORY_RESILIENCE="$INSTALL_MEMORY_RESILIENCE_OVERRIDE"
  fi
  PROFILE="${KITCHEN_A2A_PROFILE:-$PROFILE}"
  validate_profile
  validate_optional_capabilities
  validate_qdrant
  install_memory_resilience
  start_services

  echo "MemroOS setup complete for profile: $PROFILE"
}

main "$@"
