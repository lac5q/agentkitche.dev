"use client";

import { useState } from "react";
import {
  useSealProposals,
  useApproveMutation,
  useRejectMutation,
  useApplyMutation,
} from "@/lib/api-client";
import type { SealProposal } from "@/lib/api-client";

function StatusBadge({ status }: { status: SealProposal["status"] }) {
  const styles: Record<SealProposal["status"], string> = {
    pending: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    rejected: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    applied: "border-sky-500/40 bg-sky-500/10 text-sky-300",
    rolled_back: "border-slate-500/40 bg-slate-500/10 text-slate-400",
  };
  return (
    <span
      className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${styles[status]}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function DeltaBadge({ delta }: { delta: number }) {
  const positive = delta >= 0;
  return (
    <span
      className={`font-mono text-xs font-semibold ${positive ? "text-emerald-400" : "text-rose-400"}`}
    >
      {positive ? "+" : ""}
      {delta.toFixed(4)}
    </span>
  );
}

function ProposalRow({ proposal }: { proposal: SealProposal }) {
  const approveMutation = useApproveMutation();
  const rejectMutation = useRejectMutation();
  const applyMutation = useApplyMutation();
  const [expanded, setExpanded] = useState(false);

  const isPending = proposal.status === "pending";
  const isApproved = proposal.status === "approved";
  const isBusy =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    applyMutation.isPending;

  const mutationError =
    approveMutation.error ?? rejectMutation.error ?? applyMutation.error;

  return (
    <div className="border-b border-slate-800 py-3 last:border-0">
      <div className="flex flex-wrap items-start gap-3">
        {/* Meta */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-slate-200">
              {proposal.proposalType}
            </span>
            <StatusBadge status={proposal.status} />
            <span className="text-xs text-slate-500">{proposal.agentId}</span>
          </div>
          <p className="mt-1 text-xs text-slate-400 line-clamp-2">{proposal.rationale}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span>
              Baseline W={proposal.baselineW.toFixed(4)}
            </span>
            <span>
              Forecast delta: <DeltaBadge delta={proposal.forecastWDelta} />
            </span>
            <span className="text-slate-600">
              {new Date(proposal.createdAt).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex gap-2">
            {isPending && (
              <>
                <button
                  type="button"
                  onClick={() => approveMutation.mutate({ id: proposal.id })}
                  disabled={isBusy}
                  className="border border-emerald-500 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                >
                  {approveMutation.isPending ? "..." : "Approve"}
                </button>
                <button
                  type="button"
                  onClick={() => rejectMutation.mutate({ id: proposal.id })}
                  disabled={isBusy}
                  className="border border-rose-500 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                >
                  {rejectMutation.isPending ? "..." : "Reject"}
                </button>
              </>
            )}
            {isApproved && (
              <button
                type="button"
                onClick={() => applyMutation.mutate({ id: proposal.id })}
                disabled={isBusy}
                className="border border-sky-500 px-3 py-1 text-xs text-sky-300 hover:bg-sky-500/10 disabled:opacity-50"
              >
                {applyMutation.isPending ? "Applying..." : "Apply"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="border border-slate-700 px-2 py-1 text-xs text-slate-500 hover:border-slate-500 hover:text-slate-300"
            >
              {expanded ? "▲" : "▼"}
            </button>
          </div>
          {mutationError && (
            <p className="text-[11px] text-rose-400">
              {mutationError instanceof Error ? mutationError.message : "Action failed"}
            </p>
          )}
        </div>
      </div>

      {/* Diff preview */}
      {expanded && (
        <div className="mt-3 rounded border border-slate-800 bg-slate-900/60 p-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Diff
          </p>
          <pre className="overflow-x-auto text-[11px] text-slate-300">
            {JSON.stringify(proposal.diff, null, 2)}
          </pre>
          <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
            {(["l1", "l2", "l3"] as const).map((layer) => {
              const score = proposal.baselineLayers[layer]?.score;
              return (
                <div key={layer} className="text-slate-500">
                  <span className="font-mono text-slate-400">{layer}</span>{" "}
                  {score !== undefined ? score.toFixed(4) : "—"}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function ApprovalQueuePanel() {
  const { data, isLoading } = useSealProposals();
  const proposals = data?.proposals ?? [];

  const pending = proposals.filter((p) => p.status === "pending");
  const approved = proposals.filter((p) => p.status === "approved");
  const rest = proposals.filter(
    (p) => p.status !== "pending" && p.status !== "approved"
  );

  const ordered = [...pending, ...approved, ...rest];

  return (
    <section className="border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-500">
          Approval Queue
        </span>
        <div className="h-px flex-1 bg-amber-900/40" />
        <span className="text-xs text-slate-500">
          {pending.length} pending
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      ) : ordered.length === 0 ? (
        <p className="text-xs text-slate-500">No proposals yet.</p>
      ) : (
        <div>
          {ordered.map((proposal) => (
            <ProposalRow key={proposal.id} proposal={proposal} />
          ))}
        </div>
      )}
    </section>
  );
}
