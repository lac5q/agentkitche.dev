"use client";

import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useKnowledgeTrends, type CollectionTrend, type TimeSeriesWindow } from "@/lib/api-client";
import type { KnowledgeCollection } from "@/types";

const WINDOWS: { label: string; value: TimeSeriesWindow }[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

const CATEGORY_COLORS: Record<KnowledgeCollection["category"], string> = {
  business: "#0ea5e9",
  agents: "#10b981",
  marketing: "#f59e0b",
  product: "#a855f7",
  other: "#64748b",
};

function formatFreshness(lastUpdated: string | null) {
  if (!lastUpdated) return "never updated";
  const ageDays = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / 86400000);
  if (ageDays <= 0) return "updated today";
  if (ageDays === 1) return "updated yesterday";
  return `${ageDays}d stale`;
}

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: { cumulative: number } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-slate-200">{label}</p>
      <p className="text-amber-300">{payload[0].value.toLocaleString()} new/updated</p>
      <p className="text-slate-500">{payload[0].payload.cumulative.toLocaleString()} in window</p>
    </div>
  );
}

function CollectionTrendCard({ trend }: { trend: CollectionTrend }) {
  const color = CATEGORY_COLORS[trend.category];
  const stagnant = trend.recentFiles === 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100" title={trend.name}>
            {trend.name}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {trend.totalFiles.toLocaleString()} files · {formatFreshness(trend.lastUpdated)}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
            stagnant ? "bg-rose-500/10 text-rose-300" : "bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {trend.recentFiles.toLocaleString()} recent
        </span>
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={trend.points} margin={{ top: 5, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
          <XAxis dataKey="bucket" hide />
          <YAxis hide allowDecimals={false} />
          <Tooltip content={<TrendTooltip />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CollectionTrendsPanel() {
  const [window, setWindow] = useState<TimeSeriesWindow>("month");
  const trends = useKnowledgeTrends(window, 12);
  const collections = trends.data?.collections ?? [];

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-200">Collection Activity</h3>
          <p className="mt-1 text-sm text-slate-500">
            Per-collection new/updated knowledge files over time. Flat lines reveal stalled collection intake.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-950 p-1">
          {WINDOWS.map((option) => (
            <button
              key={option.value}
              onClick={() => setWindow(option.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                option.value === window
                  ? "bg-amber-500/15 text-amber-300"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {trends.isLoading && (
        <div className="flex h-40 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      )}

      {!trends.isLoading && collections.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-500">
          No collection activity data for this period.
        </div>
      )}

      {collections.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collections.map((trend) => (
            <CollectionTrendCard key={trend.name} trend={trend} />
          ))}
        </div>
      )}
    </section>
  );
}
