"use client";

import { useState } from "react";
import {
  useEvalConfig,
  useUpdateEvalConfigMutation,
  useEvalHistory,
  useRunEvalTraceMutation,
} from "@/lib/api-client";
import { PresetSelector } from "./PresetSelector";
import type { EvalConfig, EvalRunResult } from "@/lib/evals/types";

function WeightBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-6 shrink-0 font-mono text-slate-400">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-slate-800">
        <div
          className="h-2 rounded-full bg-amber-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-slate-300">{pct}%</span>
    </div>
  );
}

function DriftBadge({ status, agreement }: { status: "passed" | "halted"; agreement: number }) {
  const passed = status === "passed";
  return (
    <span
      className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${
        passed
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-rose-500/30 bg-rose-500/10 text-rose-300"
      }`}
    >
      {passed ? "passed" : "halted"} — {Math.round(agreement * 100)}% agreement
    </span>
  );
}

function RunRow({ run }: { run: EvalRunResult & { examples: EvalRunResult["driftGuard"]["examples"] } }) {
  const w = run.compositeW.toFixed(3);
  const ts = new Date(run.completedAt).toLocaleString();
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 py-2 text-xs last:border-0">
      <span className="w-24 shrink-0 truncate font-mono text-slate-400">{run.agentId}</span>
      <span className="w-12 shrink-0 text-right font-semibold text-amber-300">W={w}</span>
      <span className="shrink-0 text-slate-500">
        L1={run.layers.l1.score.toFixed(2)} L2={run.layers.l2.score.toFixed(2)} L3={run.layers.l3.score.toFixed(2)}
      </span>
      <DriftBadge status={run.driftGuard.status} agreement={run.driftGuard.agreement} />
      <span className="ml-auto shrink-0 text-slate-600">{ts}</span>
    </div>
  );
}

const DEFAULT_TEST_TRACE = {
  traceId: "test-run",
  agentId: "test-agent",
  agentModelFamily: "openai",
  role: "ops",
  input: "Summarize the current pipeline status.",
  output: "The pipeline is running normally with no errors.",
  expectedFacts: ["pipeline", "running"],
};

export function EvalEnginePanel() {
  const { data: configData, isLoading: configLoading } = useEvalConfig();
  const { data: historyData, isLoading: historyLoading } = useEvalHistory(10);
  const configMutation = useUpdateEvalConfigMutation();
  const runMutation = useRunEvalTraceMutation();

  const [editWeights, setEditWeights] = useState<{ l1: string; l2: string; l3: string } | null>(null);
  const [lastRunResult, setLastRunResult] = useState<EvalRunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const config = configData?.config;
  const runs = historyData?.runs ?? [];
  const latestDrift = runs[0]?.driftGuard ?? null;

  function startEditWeights() {
    if (!config) return;
    setEditWeights({
      l1: String(config.weights.l1),
      l2: String(config.weights.l2),
      l3: String(config.weights.l3),
    });
  }

  function saveWeights() {
    if (!config || !editWeights) return;
    const l1 = parseFloat(editWeights.l1);
    const l2 = parseFloat(editWeights.l2);
    const l3 = parseFloat(editWeights.l3);
    if ([l1, l2, l3].some((v) => !Number.isFinite(v) || v < 0)) return;
    const updated: EvalConfig = { ...config, weights: { l1, l2, l3 } };
    configMutation.mutate(updated, {
      onSuccess: () => setEditWeights(null),
    });
  }

  function triggerTestRun() {
    setRunError(null);
    setLastRunResult(null);
    runMutation.mutate(DEFAULT_TEST_TRACE, {
      onSuccess: (data) => setLastRunResult(data.result),
      onError: (err) => setRunError(err instanceof Error ? err.message : "Eval run failed"),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Config panel */}
      <section className="border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-500">
            Eval Config
          </span>
          <div className="h-px flex-1 bg-amber-900/40" />
          {!editWeights && (
            <button
              type="button"
              onClick={startEditWeights}
              className="border border-slate-700 px-3 py-1 text-xs text-slate-300 hover:border-amber-500 hover:text-amber-300"
            >
              Edit weights
            </button>
          )}
        </div>

        {/* Phase 60: preset selector */}
        <PresetSelector />

        {configLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        ) : config ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">Judge model</p>
              <p className="font-mono text-sm text-slate-100">{config.judgeModel.model}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {config.judgeModel.provider} / {config.judgeModel.modelFamily} / {config.judgeModel.promptTemplateVersion}
              </p>
            </div>
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">Weights (l1/l2/l3)</p>
              {editWeights ? (
                <div className="flex flex-col gap-2">
                  {(["l1", "l2", "l3"] as const).map((k) => (
                    <label key={k} className="flex items-center gap-2 text-xs">
                      <span className="w-6 font-mono text-slate-400">{k}</span>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.05"
                        value={editWeights[k]}
                        onChange={(e) => setEditWeights((prev) => prev ? { ...prev, [k]: e.target.value } : prev)}
                        className="w-20 border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                      />
                    </label>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={saveWeights}
                      disabled={configMutation.isPending}
                      className="border border-amber-500 px-3 py-1 text-xs text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
                    >
                      {configMutation.isPending ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditWeights(null)}
                      className="border border-slate-700 px-3 py-1 text-xs text-slate-400 hover:border-slate-500"
                    >
                      Cancel
                    </button>
                  </div>
                  {configMutation.isError && (
                    <p className="text-xs text-rose-400">
                      {configMutation.error instanceof Error ? configMutation.error.message : "Save failed"}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <WeightBar value={config.weights.l1} label="l1" />
                  <WeightBar value={config.weights.l2} label="l2" />
                  <WeightBar value={config.weights.l3} label="l3" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Config unavailable</p>
        )}
      </section>

      {/* Drift guard status */}
      <section className="border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-500">Drift Guard</span>
          <div className="h-px flex-1 bg-amber-900/40" />
        </div>
        {latestDrift ? (
          <div className="flex flex-wrap items-center gap-3">
            <DriftBadge status={latestDrift.status} agreement={latestDrift.agreement} />
            <span className="text-xs text-slate-500">
              Floor: {Math.round(latestDrift.floor * 100)}%
            </span>
            <span className="text-xs font-mono text-slate-500">
              golden@{latestDrift.goldenSetVersion.slice(0, 8)}
            </span>
          </div>
        ) : (
          <p className="text-xs text-slate-500">No drift guard data yet — run an eval first.</p>
        )}
      </section>

      {/* Test run */}
      <section className="border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-500">Test Eval Run</span>
          <div className="h-px flex-1 bg-amber-900/40" />
          <button
            type="button"
            onClick={triggerTestRun}
            disabled={runMutation.isPending}
            className="border border-amber-500 px-3 py-1.5 text-xs text-amber-300 hover:bg-amber-500/10 disabled:opacity-50"
          >
            {runMutation.isPending ? "Running..." : "Run test eval"}
          </button>
        </div>

        {runError && (
          <p className="rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {runError}
          </p>
        )}

        {lastRunResult && (
          <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <span className="font-semibold text-emerald-300">
                W={lastRunResult.compositeW.toFixed(3)}
              </span>
              <DriftBadge
                status={lastRunResult.driftGuard.status}
                agreement={lastRunResult.driftGuard.agreement}
              />
            </div>
            <div className="flex gap-4 text-slate-400">
              <span>L1={lastRunResult.layers.l1.score.toFixed(3)}</span>
              <span>L2={lastRunResult.layers.l2.score.toFixed(3)}</span>
              <span>L3={lastRunResult.layers.l3.score.toFixed(3)}</span>
            </div>
            <div className="mt-1 text-slate-500">
              Judge: {lastRunResult.judge.score.toFixed(3)} (faithful={lastRunResult.judge.rubricScores.faithful.toFixed(2)} useful={lastRunResult.judge.rubricScores.useful.toFixed(2)} policy={lastRunResult.judge.rubricScores.policy.toFixed(2)})
            </div>
          </div>
        )}
      </section>

      {/* Run history */}
      <section className="border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-500">
            Recent Runs
          </span>
          <div className="h-px flex-1 bg-amber-900/40" />
          <span className="text-xs text-slate-500">{runs.length} shown</span>
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        ) : runs.length === 0 ? (
          <p className="text-xs text-slate-500">No eval runs yet.</p>
        ) : (
          <div>
            {runs.map((run) => (
              <RunRow key={run.id} run={run} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
