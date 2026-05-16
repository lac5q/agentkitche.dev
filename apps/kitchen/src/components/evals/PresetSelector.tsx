"use client";

import { useEvalConfig, useSetActivePresetMutation } from "@/lib/api-client";
import type { EvalWeights } from "@/lib/evals/types";

function WeightBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300">
      <span className="text-slate-500">{label}</span>
      <span className="text-amber-300">{Math.round(value * 100)}%</span>
    </span>
  );
}

function PresetWeightBadges({ weights }: { weights: EvalWeights }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <WeightBadge label="L1" value={weights.l1} />
      <WeightBadge label="L2" value={weights.l2} />
      <WeightBadge label="L3" value={weights.l3} />
    </div>
  );
}

/**
 * Dropdown selector for named eval weight presets.
 * Appears at the top of the config section in the EvalEnginePanel.
 * Selecting a preset POSTs to /api/evals/config to set active_preset.
 * Selecting "custom" clears the active preset (reverts to manual weights).
 */
export function PresetSelector() {
  const { data: configData, isLoading } = useEvalConfig();
  const mutation = useSetActivePresetMutation();

  const config = configData?.config;
  const presets = config?.weightPresets ?? {};
  const activePreset = config?.activePreset ?? null;

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    mutation.mutate(value === "custom" ? null : value);
  }

  if (isLoading || !config) return null;

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Weight Preset
        </span>
        <select
          value={activePreset ?? "custom"}
          onChange={handleChange}
          disabled={mutation.isPending}
          className="border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-100 focus:border-amber-500 focus:outline-none disabled:opacity-50"
        >
          <option value="custom">Custom (manual weights)</option>
          {Object.keys(presets).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        {mutation.isPending && (
          <span className="text-xs text-slate-500">Saving...</span>
        )}
        {mutation.isError && (
          <span className="text-xs text-rose-400">
            {mutation.error instanceof Error ? mutation.error.message : "Failed"}
          </span>
        )}
      </div>

      {activePreset && presets[activePreset] && (
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500">Active preset weights:</span>
          <PresetWeightBadges weights={presets[activePreset]} />
        </div>
      )}
    </div>
  );
}
