/**
 * Phase 64: HIL SLA configuration helpers.
 *
 * Parses the `hil.sla_defaults` block from memroos.eval.yaml.
 * Time values support shorthand strings: "4h" → 14400, "24h" → 86400, "8h" → 28800.
 * Falls back to hardcoded defaults if the config file is unavailable.
 */

import { loadEvalConfig } from "./config";

/** Default SLA in seconds per escalation type. */
const SLA_DEFAULTS_SECONDS: Record<string, number> = {
  agent_escalate: 4 * 60 * 60,       // 4h
  seal_approval: 24 * 60 * 60,        // 24h
  eval_below_threshold: 8 * 60 * 60,  // 8h
};

/**
 * Parses a duration string ("4h", "24h", "30m", "3600") into seconds.
 * Returns the fallback if parsing fails.
 */
function parseDurationToSeconds(value: string | number, fallback: number): number {
  if (typeof value === "number") return value;
  const trimmed = value.trim();
  const hoursMatch = trimmed.match(/^(\d+(?:\.\d+)?)h$/);
  if (hoursMatch) return Math.round(parseFloat(hoursMatch[1]) * 3600);
  const minutesMatch = trimmed.match(/^(\d+(?:\.\d+)?)m$/);
  if (minutesMatch) return Math.round(parseFloat(minutesMatch[1]) * 60);
  const seconds = Number(trimmed);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : fallback;
}

/** Cached SLA config to avoid repeated file reads. */
let _cachedSla: Record<string, number> | null = null;

/**
 * Returns the SLA deadline in seconds for the given escalation type.
 * Reads from `hil.sla_defaults` in memroos.eval.yaml; falls back to hardcoded defaults.
 */
export function getSlaSeconds(escalationType: string): number {
  if (!_cachedSla) {
    try {
      const config = loadEvalConfig();
      // Access hil block via raw config — it may not be in the typed EvalConfig yet
      const raw = config as unknown as { hil?: { sla_defaults?: Record<string, string | number> } };
      if (raw.hil?.sla_defaults) {
        _cachedSla = {};
        for (const [key, value] of Object.entries(raw.hil.sla_defaults)) {
          const fallback = SLA_DEFAULTS_SECONDS[key] ?? 4 * 60 * 60;
          _cachedSla[key] = parseDurationToSeconds(value, fallback);
        }
      } else {
        _cachedSla = { ...SLA_DEFAULTS_SECONDS };
      }
    } catch {
      _cachedSla = { ...SLA_DEFAULTS_SECONDS };
    }
  }
  return _cachedSla[escalationType] ?? SLA_DEFAULTS_SECONDS[escalationType] ?? 4 * 60 * 60;
}

/**
 * Clears the SLA config cache — useful for tests.
 */
export function clearSlaConfigCache(): void {
  _cachedSla = null;
}
