"use client";

import { useCacheStats, usePurgeCacheMutation } from "@/lib/api-client";

function formatBytes(bytes: number): string {
  if (bytes >= 1_048_576) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export function CacheHealthPanel() {
  const { data, isLoading } = useCacheStats();
  const purge = usePurgeCacheMutation();
  const stats = data?.stats;
  const requests = (stats?.hits ?? 0) + (stats?.misses ?? 0);
  const hitRate = requests > 0 ? Math.round(((stats?.hits ?? 0) / requests) * 100) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-amber-500">
          Cache Health
        </span>
        <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${
          data?.performance.ok === false
            ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
        }`}>
          {data?.performance.ok === false ? "budget risk" : "within budget"}
        </span>
        <div className="h-px flex-1 bg-amber-900/40" />
        <button
          type="button"
          onClick={() => purge.mutate(undefined)}
          className="border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-amber-500 hover:text-amber-300"
        >
          Purge
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="border border-slate-800 bg-slate-950/30 p-3">
              <p className="text-xs text-slate-500">Entries</p>
              <p className="mt-1 text-2xl font-semibold text-slate-100">{stats?.entries ?? 0}</p>
            </div>
            <div className="border border-slate-800 bg-slate-950/30 p-3">
              <p className="text-xs text-slate-500">Hit Rate</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-300">{hitRate}%</p>
            </div>
            <div className="border border-slate-800 bg-slate-950/30 p-3">
              <p className="text-xs text-slate-500">Memory</p>
              <p className="mt-1 text-2xl font-semibold text-sky-300">{formatBytes(stats?.memoryBytes ?? 0)}</p>
            </div>
            <div className="border border-slate-800 bg-slate-950/30 p-3">
              <p className="text-xs text-slate-500">Invalidations</p>
              <p className="mt-1 text-2xl font-semibold text-amber-300">{stats?.invalidations ?? 0}</p>
            </div>
          </div>

          <div className="border border-slate-800 bg-slate-950/30 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Latency Budgets</p>
            <div className="grid gap-2 md:grid-cols-2">
              {(data?.performance.routes ?? []).map((route) => (
                <div key={route.route} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-slate-300">{route.route}</span>
                  <span className={route.status === "pass" ? "text-emerald-300" : "text-rose-300"}>
                    p95 {route.p95Ms}ms / {route.budgetMs}ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
