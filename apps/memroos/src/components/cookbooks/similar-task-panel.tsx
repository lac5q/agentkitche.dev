"use client";

import { useSimilarTaskRecommendations } from "@/lib/api-client";
import type { ToolAttentionContextPack } from "@/types";
import { Cpu } from "lucide-react";

interface SimilarTaskPanelProps {
  context?: ToolAttentionContextPack;
}

export function SimilarTaskPanel({ context = {} }: SimilarTaskPanelProps) {
  const { data, isLoading } = useSimilarTaskRecommendations(context);
  const recommendations = data?.recommendations ?? [];

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Cpu className="h-4 w-4 text-amber-500" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
          Similar Task Recommendations
        </h3>
      </div>
      {isLoading ? (
        <p className="py-4 text-center text-xs text-slate-500">Loading recommendations...</p>
      ) : recommendations.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-500">
          No similar-task recommendations yet. Record tool outcomes to enable this.
        </p>
      ) : (
        <div className="space-y-2">
          {recommendations.map((rec) => (
            <div
              key={rec.capabilityId}
              className="flex items-start justify-between gap-3 rounded-lg bg-slate-950/60 p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-400">{rec.name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{rec.reason}</p>
              </div>
              <span
                className="shrink-0 rounded border border-sky-700/30 bg-sky-900/20 px-2 py-1 text-xs text-sky-300"
                title={`Context match score: ${rec.contextScore}`}
              >
                +{rec.contextScore}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
