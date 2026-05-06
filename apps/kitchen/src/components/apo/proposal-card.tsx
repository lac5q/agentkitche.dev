"use client";

import type React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useApproveApoProposalMutation } from "@/lib/api-client";
import type { ApoProposal } from "@/types";

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

interface ProposalCardProps {
  proposal: ApoProposal;
  onClick: (proposal: ApoProposal) => void;
}

export function ProposalCard({ proposal, onClick }: ProposalCardProps) {
  const isPending = proposal.status === "pending";
  const preview = proposal.content.slice(0, 200).replace(/#+\s/g, "").trim();
  const approveProposal = useApproveApoProposalMutation();

  function handleApprove(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    approveProposal.mutate(proposal.id);
  }

  return (
    <Card
      className={[
        "border-slate-800 bg-slate-900/50 p-4 cursor-pointer transition-colors",
        "hover:border-slate-700 hover:bg-slate-800/60",
        isPending ? "border-l-2 border-l-amber-500" : "",
      ].join(" ")}
      onClick={() => onClick(proposal)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-100 text-sm truncate">
              {proposal.skill}
            </span>
            <Badge
              variant="outline"
              className={
                isPending
                  ? "border-amber-500/50 text-amber-400 text-xs"
                  : "border-slate-600 text-slate-400 text-xs"
              }
            >
              {proposal.status}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            subsystem: <span className="text-slate-400">{proposal.subsystem}</span>
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {formatDateTime(proposal.timestamp)}
          </p>
          <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
            {preview}
            {proposal.content.length > 200 && "…"}
          </p>
          {approveProposal.isError && (
            <p className="mt-2 text-xs text-rose-400">
              {approveProposal.error instanceof Error
                ? approveProposal.error.message
                : "Approval failed"}
            </p>
          )}
        </div>
        {isPending && (
          <button
            type="button"
            onClick={handleApprove}
            disabled={approveProposal.isPending}
            className="shrink-0 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition-colors hover:border-emerald-400 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {approveProposal.isPending ? "Approving…" : "Approve"}
          </button>
        )}
      </div>
    </Card>
  );
}
