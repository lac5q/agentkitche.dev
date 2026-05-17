"use client";

import { useState } from "react";
import { useRunPolicyLabMutation } from "@/lib/api-client";
import type { MemoryPolicyVariant, PolicyRankResult } from "@/lib/api-client";

const DEFAULT_VARIANTS: MemoryPolicyVariant[] = [
  { name: "k=3 vector-only", config: { k: 3, tiers: ["vector"], salience: "standard" } },
  { name: "k=5 multi-tier", config: { k: 5, tiers: ["vector", "episodic", "graph"], salience: "standard" } },
  { name: "k=5 high-salience", config: { k: 5, tiers: ["vector", "episodic"], salience: "high" } },
];

function WBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-slate-800">
        <div
          className="h-2 rounded-full bg-violet-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs text-slate-300">{value.toFixed(4)}</span>
    </div>
  );
}

function RankRow({ result }: { result: PolicyRankResult }) {
  const [expanded, setExpanded] = useState(false);
  const medal = result.rank === 1 ? "gold" : result.rank === 2 ? "silver" : result.rank === 3 ? "bronze" : null;
  const medalColors: Record<string, string> = {
    gold: "text-yellow-400",
    silver: "text-slate-300",
    bronze: "text-orange-400",
  };

  return (
    <div className="border-b border-slate-800 py-3 last:border-0">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`w-6 shrink-0 text-center font-mono text-sm font-bold ${medal ? medalColors[medal] : "text-slate-500"}`}
        >
          {result.rank}
        </span>
        <span className="min-w-0 flex-1 text-sm font-medium text-slate-200 truncate">
          {result.name}
        </span>
        <WBar value={result.compositeW} />
        <div className="flex gap-3 text-xs text-slate-500">
          <span>L1={result.layerScores.l1.toFixed(3)}</span>
          <span>L2={result.layerScores.l2.toFixed(3)}</span>
          <span>L3={result.layerScores.l3.toFixed(3)}</span>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="shrink-0 border border-slate-700 px-2 py-0.5 text-xs text-slate-500 hover:border-slate-500 hover:text-slate-300"
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>
      {expanded && (
        <div className="mt-2 rounded border border-slate-800 bg-slate-900/60 p-2">
          <pre className="text-[11px] text-slate-400">
            {JSON.stringify(result.variantConfig, null, 2)}
          </pre>
          <p className="mt-1 text-[10px] text-slate-600">run: {result.evalRunId}</p>
        </div>
      )}
    </div>
  );
}

export function PolicyLabPanel() {
  const runMutation = useRunPolicyLabMutation();
  const [goldenSetId, setGoldenSetId] = useState("./golden-sets/business-ops-50.jsonl");
  const [variantText, setVariantText] = useState(JSON.stringify(DEFAULT_VARIANTS, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  function handleRun() {
    setParseError(null);
    let variants: MemoryPolicyVariant[];
    try {
      variants = JSON.parse(variantText) as MemoryPolicyVariant[];
    } catch {
      setParseError("Invalid JSON in variants field");
      return;
    }
    if (!Array.isArray(variants) || variants.length === 0) {
      setParseError("variants must be a non-empty array");
      return;
    }
    runMutation.mutate({ variants, goldenSetId: goldenSetId.trim() || undefined });
  }

  const ranked = runMutation.data?.ranked ?? [];

  return (
    <section className="border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-violet-400">
          Memory Policy Lab
        </span>
        <div className="h-px flex-1 bg-violet-900/40" />
        <span className="text-xs text-slate-500">Karpathy-style fixed-harness ranking</span>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        {/* Golden set ID */}
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Golden Set Path / Role Key
          </label>
          <input
            type="text"
            value={goldenSetId}
            onChange={(e) => setGoldenSetId(e.target.value)}
            placeholder="./golden-sets/business-ops-50.jsonl"
            className="w-full border border-slate-700 bg-slate-900 px-3 py-1.5 font-mono text-xs text-slate-100 focus:border-violet-500 focus:outline-none"
          />
        </div>

        {/* Run button */}
        <div className="flex items-end">
          <button
            type="button"
            onClick={handleRun}
            disabled={runMutation.isPending}
            className="border border-violet-500 px-4 py-1.5 text-xs text-violet-300 hover:bg-violet-500/10 disabled:opacity-50"
          >
            {runMutation.isPending ? "Running..." : "Run ranking"}
          </button>
        </div>
      </div>

      {/* Variants editor */}
      <div className="mb-4">
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Policy Variants (JSON)
        </label>
        <textarea
          value={variantText}
          onChange={(e) => setVariantText(e.target.value)}
          rows={8}
          className="w-full resize-y border border-slate-700 bg-slate-900 px-3 py-2 font-mono text-[11px] text-slate-100 focus:border-violet-500 focus:outline-none"
          spellCheck={false}
        />
        {parseError && (
          <p className="mt-1 text-xs text-rose-400">{parseError}</p>
        )}
      </div>

      {/* Error state */}
      {runMutation.isError && (
        <p className="mb-3 rounded border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
          {runMutation.error instanceof Error ? runMutation.error.message : "Ranking failed"}
        </p>
      )}

      {/* Results */}
      {ranked.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              W Rankings ({ranked.length} variants)
            </span>
            <div className="h-px flex-1 bg-slate-800" />
            <span className="text-[10px] text-slate-600">
              golden: {runMutation.data?.goldenSetId}
            </span>
          </div>
          {ranked.map((result) => (
            <RankRow key={result.name} result={result} />
          ))}
        </div>
      )}
    </section>
  );
}
