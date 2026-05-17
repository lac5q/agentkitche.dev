"use client";

import { useContextSourceHealth } from "@/lib/api-client";

const STATUS_STYLES: Record<string, string> = {
  ok: "bg-green-50 text-green-700",
  stale: "bg-amber-50 text-amber-700",
  missing: "bg-red-50 text-red-700",
  degraded: "bg-red-50 text-red-700",
  disabled: "bg-slate-100 text-slate-500",
};

export function ContextSourcesPanel() {
  const { data, isLoading, error } = useContextSourceHealth();

  if (isLoading) return <p className="text-sm text-slate-500">Loading context sources...</p>;
  if (error) return <p className="text-sm text-red-600">Failed to load context source health.</p>;

  const sources = data?.sources ?? [];
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Context Sources</h3>
        <p className="mt-1 text-xs text-slate-500">
          Gmail, Spark, qmd, mem0, and local source lanes with freshness and repair evidence.
        </p>
      </div>
      <div className="overflow-hidden rounded-sm border border-slate-800">
        <table className="w-full text-xs">
          <thead className="bg-slate-950/60 text-left text-slate-400">
            <tr>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Age</th>
              <th className="px-3 py-2 font-medium">Docs</th>
              <th className="px-3 py-2 font-medium">Repair</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id} className="border-t border-slate-800 text-slate-300">
                <td className="px-3 py-2 font-medium">{source.id}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLES[source.status] ?? STATUS_STYLES.degraded}`}>
                    {source.status}
                  </span>
                </td>
                <td className="px-3 py-2">{source.ageMinutes == null ? "n/a" : `${source.ageMinutes}m`}</td>
                <td className="px-3 py-2">{source.documentCount}</td>
                <td className="px-3 py-2 text-slate-400">{source.repairHint}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
