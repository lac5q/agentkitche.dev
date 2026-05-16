"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useEvalHistory } from "@/lib/api-client";
import type { EvalRunResult } from "@/lib/evals/types";

interface KpiTimelinePanelProps {
  agentId?: string;
  dateRange?: { since: string; until?: string };
}

interface TimelinePoint {
  date: string;
  runId: string;
  traceId: string;
  compositeW: number;
  l1: number;
  l2: number;
  l3: number | null;
}

function runToPoint(run: EvalRunResult & { examples?: unknown[] }): TimelinePoint {
  const l3Scorers = run.layers.l3?.scorers ?? [];
  const allL3Unavailable =
    l3Scorers.length > 0 && l3Scorers.every((s) => s.metadata?.unavailable === true);

  return {
    date: new Date(run.completedAt).toLocaleDateString(),
    runId: run.id,
    traceId: run.traceId,
    compositeW: run.compositeW,
    l1: run.layers.l1?.score ?? 0,
    l2: run.layers.l2?.score ?? 0,
    l3: allL3Unavailable ? null : (run.layers.l3?.score ?? null),
  };
}

export function KpiTimelinePanel({ agentId, dateRange }: KpiTimelinePanelProps) {
  const [showL1, setShowL1] = useState(true);
  const [showL2, setShowL2] = useState(true);
  const [showL3, setShowL3] = useState(true);

  const { data, isLoading, error } = useEvalHistory(50);

  const points = useMemo<TimelinePoint[]>(() => {
    if (!data?.runs) return [];
    let runs = data.runs as (EvalRunResult & { examples?: unknown[] })[];

    if (agentId) {
      runs = runs.filter((r) => r.agentId === agentId);
    }
    if (dateRange?.since) {
      const since = new Date(dateRange.since).getTime();
      runs = runs.filter((r) => new Date(r.completedAt).getTime() >= since);
    }
    if (dateRange?.until) {
      const until = new Date(dateRange.until).getTime();
      runs = runs.filter((r) => new Date(r.completedAt).getTime() <= until);
    }

    return runs.map(runToPoint).reverse();
  }, [data, agentId, dateRange]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[#73736b]">
        Loading timeline...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-red-500">
        Failed to load timeline data.
      </div>
    );
  }

  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-[#73736b]">
        No eval runs found
        {agentId ? ` for agent ${agentId}` : ""}.
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-[#c9c9c2] bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[#0f0f0e]">W Score Timeline</h3>
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showL1}
              onChange={(e) => setShowL1(e.target.checked)}
              className="h-3 w-3"
            />
            <span className="text-[#7c7c75]">L1</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showL2}
              onChange={(e) => setShowL2(e.target.checked)}
              className="h-3 w-3"
            />
            <span className="text-[#7c7c75]">L2</span>
          </label>
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={showL3}
              onChange={(e) => setShowL3(e.target.checked)}
              className="h-3 w-3"
            />
            <span className="text-[#7c7c75]">L3</span>
          </label>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={points} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4dd" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#c9c9c2" />
          <YAxis domain={[0, 1]} tick={{ fontSize: 10 }} stroke="#c9c9c2" />
          <Tooltip
            formatter={(value, name) => {
              const num = typeof value === "number" ? value.toFixed(4) : "—";
              return [num, String(name)];
            }}
            contentStyle={{ fontSize: 11, border: "1px solid #c9c9c2" }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="compositeW" stroke="#a8392c" strokeWidth={2} dot={false} name="W" />
          {showL1 && <Line type="monotone" dataKey="l1" stroke="#4a90e2" strokeWidth={1.5} dot={false} name="L1" />}
          {showL2 && <Line type="monotone" dataKey="l2" stroke="#7c7c75" strokeWidth={1.5} dot={false} name="L2" />}
          {showL3 && <Line type="monotone" dataKey="l3" stroke="#22c55e" strokeWidth={1.5} dot={false} name="L3" connectNulls={false} />}
        </LineChart>
      </ResponsiveContainer>
      <p className="mt-2 text-[10px] text-[#73736b]">
        {points.length} run{points.length !== 1 ? "s" : ""} shown.
        L3 gaps indicate no business-outcome events yet for those traces.
        Click a data point to view the eval run.
      </p>
    </div>
  );
}
