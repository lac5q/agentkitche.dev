import type { EvalConfig, EvalWeights } from "./types";

/**
 * Built-in named weight preset profiles.
 * Stored here as a fallback if the YAML file is missing the weight_presets block.
 *
 * | Preset              | L1  | L2  | L3  | Intended use                                    |
 * |---------------------|-----|-----|-----|-------------------------------------------------|
 * | outcome-weighted    | 0.1 | 0.4 | 0.5 | Sales / ops — business completion is primary    |
 * | quality-weighted    | 0.2 | 0.6 | 0.2 | Support — rubric quality dominates              |
 * | compliance-weighted | 0.4 | 0.4 | 0.2 | Finance — tool-call schema correctness critical |
 */
export const BUILT_IN_PRESETS: Record<string, EvalWeights> = {
  "outcome-weighted": { l1: 0.1, l2: 0.4, l3: 0.5 },
  "quality-weighted": { l1: 0.2, l2: 0.6, l3: 0.2 },
  "compliance-weighted": { l1: 0.4, l2: 0.4, l3: 0.2 },
};

/**
 * Resolves the effective weight vector for an eval run.
 *
 * Priority order:
 * 1. Active preset (when config.activePreset is non-null) — global operator override.
 *    Falls back to BUILT_IN_PRESETS if the preset name is missing from config.weightPresets.
 * 2. Manual config.weights block (default).
 *
 * Note: per-agent overrides from config.agents are NOT applied on top of a preset.
 * A preset is an operator-level signal that overrides manual tuning globally.
 * To apply per-agent overrides without a preset, set activePreset to null.
 */
export function resolveWeights(config: EvalConfig): EvalWeights {
  if (config.activePreset) {
    const preset =
      (config.weightPresets[config.activePreset] ??
       BUILT_IN_PRESETS[config.activePreset]);
    if (preset) return preset;
  }
  return config.weights;
}
