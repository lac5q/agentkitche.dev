"use client";

import { Button } from "@/components/ui/button";
import {
  useOrchestrationHil,
  useResolveOrchestrationHilMutation,
} from "@/lib/api-client";

export function OrchestrationHilPanel() {
  const { data, isError, isLoading } = useOrchestrationHil();
  const resolveDecision = useResolveOrchestrationHilMutation();
  const decisions = data?.decisions ?? [];

  return (
    <section className="rounded-xl border border-amber-500/20 bg-slate-950/60 p-4 shadow-lg shadow-amber-950/10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-500/80">Orchestration</p>
          <h2 className="text-lg font-semibold text-slate-100">Human approvals</h2>
        </div>
        <span className="rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-400">
          {decisions.length} pending
        </span>
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-400">Checking orchestration decisions...</p>
      ) : isError ? (
        <p className="text-sm text-amber-400">Approval queue unavailable. Operator authorization may be required.</p>
      ) : decisions.length === 0 ? (
        <p className="text-sm text-slate-500">No pending approvals. The broker is clear.</p>
      ) : (
        <div className="space-y-3">
          {decisions.map((decision) => (
            <article key={decision.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-100">{decision.taskSummary}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>{decision.correlationId}</span>
                    {decision.selectedAgentId && <span>Agent: {decision.selectedAgentId}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="xs"
                    onClick={() => resolveDecision.mutate({ id: decision.id, decision: "approve" })}
                    disabled={resolveDecision.isPending}
                  >
                    Approve
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => resolveDecision.mutate({ id: decision.id, decision: "reject" })}
                    disabled={resolveDecision.isPending}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
