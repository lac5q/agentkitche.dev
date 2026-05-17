#!/usr/bin/env bash
#
# Local Batch Embedding Runner
# Runs QMD embeddings on this MacBook using the locally configured model.
#
# Environment flags:
#   QMD_EMBED_FORCE=1      run qmd embed -f
#   QMD_UPDATE_FIRST=1     run qmd update before embedding
#   QMD_DAYTIME_CHECK=1    skip daytime runs when CPU or memory is busy
#   QMD_MIN_FREE_GB=4      minimum free+speculative memory for daytime runs
#   QMD_MAX_LOAD_PER_CPU=.75 maximum 1-minute load per CPU for daytime runs
#
# Usage:
#   ./scripts/batch-embed.sh [--dry-run]
#

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT_DIR/services/memory/logs"
LOG_FILE="$LOG_DIR/batch-embed.log"
LOCK_DIR="$LOG_DIR/batch-embed.lock"

PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
export PATH

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

QMD_EMBED_FORCE="${QMD_EMBED_FORCE:-0}"
QMD_UPDATE_FIRST="${QMD_UPDATE_FIRST:-0}"
QMD_DAYTIME_CHECK="${QMD_DAYTIME_CHECK:-1}"
QMD_MIN_FREE_GB="${QMD_MIN_FREE_GB:-4}"
QMD_MAX_LOAD_PER_CPU="${QMD_MAX_LOAD_PER_CPU:-0.75}"

mkdir -p "$LOG_DIR"

log() {
  local line
  line="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  if [[ -t 1 ]]; then
    printf '%s\n' "$line" | tee -a "$LOG_FILE"
  else
    printf '%s\n' "$line" >> "$LOG_FILE"
  fi
}

run_cmd() {
  log "+ $*"
  if [[ "$DRY_RUN" == "1" ]]; then
    return 0
  fi
  "$@"
}

run_awake() {
  if [[ "$DRY_RUN" == "1" ]]; then
    log "+ $*"
    return 0
  fi

  if command -v caffeinate >/dev/null 2>&1; then
    log "+ caffeinate -s $*"
    caffeinate -s "$@"
  else
    run_cmd "$@"
  fi
}

free_memory_gb() {
  vm_stat | awk '
    /page size of/ { page_size=$8 }
    /Pages free:/ { gsub(/\./, "", $3); pages += $3 }
    /Pages speculative:/ { gsub(/\./, "", $3); pages += $3 }
    END {
      if (!page_size) page_size=4096
      printf "%.2f", pages * page_size / 1024 / 1024 / 1024
    }
  '
}

should_skip_for_daytime_pressure() {
  local hour cores load free_gb max_load
  hour="$(date '+%H')"

  if [[ "$QMD_DAYTIME_CHECK" != "1" || "$hour" -lt 8 || "$hour" -ge 20 ]]; then
    return 1
  fi

  cores="$(sysctl -n hw.ncpu)"
  load="$(sysctl -n vm.loadavg | awk '{ gsub(/[{}]/, ""); print $2 }')"
  free_gb="$(free_memory_gb)"
  max_load="$(awk -v cores="$cores" -v per_cpu="$QMD_MAX_LOAD_PER_CPU" 'BEGIN { printf "%.2f", cores * per_cpu }')"

  log "Daytime resource check: load=$load max_load=$max_load free_gb=$free_gb min_free_gb=$QMD_MIN_FREE_GB"

  awk -v load="$load" -v max_load="$max_load" -v free_gb="$free_gb" -v min_free="$QMD_MIN_FREE_GB" \
    'BEGIN { exit !((load > max_load) || (free_gb < min_free)) }'
}

cleanup() {
  rmdir "$LOCK_DIR" 2>/dev/null || true
}

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  log "Another batch embedding run is already active; exiting."
  exit 0
fi
trap cleanup EXIT

main() {
  log "=== Memroos Local Batch Embedding Runner ==="
  log "Root: $ROOT_DIR"

  if should_skip_for_daytime_pressure; then
    log "Skipping daytime embedding run because CPU or memory is busy."
    exit 0
  fi

  if ! command -v qmd >/dev/null 2>&1; then
    log "qmd is not on PATH; cannot run embeddings."
    exit 127
  fi

  run_cmd qmd status

  if [[ "$QMD_UPDATE_FIRST" == "1" ]]; then
    run_awake qmd update
  else
    log "Skipping qmd update; set QMD_UPDATE_FIRST=1 to refresh collections first."
  fi

  if [[ "$QMD_EMBED_FORCE" == "1" ]]; then
    run_awake qmd embed -f
  else
    run_awake qmd embed
  fi

  run_cmd qmd status
  log "Local batch embeddings complete."
}

main "$@"
