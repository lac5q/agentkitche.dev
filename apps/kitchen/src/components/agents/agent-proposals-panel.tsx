"use client";

import { useAgentProposals, useApproveMutation, useRejectMutation, useApplyMutation } from "@/lib/api-client";
import type { AgentProposal } from "@/lib/api-client";

const PROPOSAL_TYPE_LABELS: Record<string, string> = {
  agent_instruction_patch: "Instruction Patch",
  skill_addition: "Skill Addition",
  tool_routing_update: "Tool Routing Update",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  rejected: "border-rose-500/30 bg-rose-500/10 text-rose-300",
  applied: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  rolled_back: "border-slate-500/30 bg-slate-500/10 text-slate-400",
};

function TypeBadge({ type }: { type: string }) {
  const label = PROPOSAL_TYPE_LABELS[type] ?? type;
  return (
    <span className="rounded border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-300">
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: AgentProposal["status"] }) {
  const styles = STATUS_STYLES[status] ?? "border-slate-700 text-slate-400";
  return (
    <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${styles}`}>
      {status}
    </span>
  );
}

function DiffViewer({ diff }: { diff: Record<string, unknown> }) {
  return (
    <pre className="mt-1 max-h-24 overflow-auto rounded border border-slate-800 bg-slate-950 p-2 text-[10px] leading-relaxed text-slate-400">
      {JSON.stringify(diff, null, 2)}
    </pre>
  );
}

function ProposalRow({ proposal }: { proposal: AgentProposal }) {
  const approveMutation = useApproveMutation();
  const rejectMutation = useRejectMutation();
  const applyMutation = useApplyMutation();

  const isPending = proposal.status === "pending";
  const isApproved = proposal.status === "approved";

  return (
    <div className="flex flex-col gap-2 border-b border-slate-800 py-4 last:border-0">
      <div className="flex flex-wrap items-center gap-2">
        <TypeBadge type={proposal.proposalType} />
        <StatusBadge status={proposal.status} />
        <span className="font-mono text-xs text-slate-400">{proposal.agentId}</span>
        <span className="ml-auto text-xs text-slate-500">
          {proposal.forecastWDelta >= 0 ? "+" : ""}
          {proposal.forecastWDelta.toFixed(3)} W-delta
        </span>
      </div>

      <p className="text-xs text-slate-400">{proposal.rationale}</p>

      <DiffViewer diff={proposal.diff} />

      <div className="flex flex-wrap gap-2">
        {isPending && (
          <>
            <button
              type="button"
              disabled={approveMutation.isPending}
              onClick={() => approveMutation.mutate({ id: proposal.id })}
              className="border border-emerald-500/50 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
            >
              {approveMutation.isPending ? "Approving..." : "Approve"}
            </button>
            <button
              type="button"
              disabled={rejectMutation.isPending}
              onClick={() => rejectMutation.mutate({ id: proposal.id })}
              className="border border-rose-500/50 px-3 py-1 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
            >
              {rejectMutation.isPending ? "Rejecting..." : "Reject"}
            </button>
          </>
        )}
        {isApproved && (
          <button
            type="button"
            disabled={applyMutation.isPending}
            onClick={() => applyMutation.mutate({ id: proposal.id })}
            className="border border-sky-500/50 px-3 py-1 text-xs text-sky-300 hover:bg-sky-500/10 disabled:opacity-50"
          >
            {applyMutation.isPending ? "Applying..." : "Apply"}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Panel listing agent-level SEAL proposals (instruction_patch, skill_addition, tool_routing_update).
 * Provides approve, reject, and apply actions inline.
 */
export function AgentProposalsPanel() {
  const { data, isLoading } = useAgentProposals();
  const proposals = data?.proposals ?? [];

  return (
    <div className="flex flex-col gap-6">
      <section className="border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-500">
            Agent Proposals
          </span>
          <div className="h-px flex-1 bg-amber-900/40" />
          <span className="text-xs text-slate-500">{proposals.length} proposal{proposals.length !== 1 ? "s" : ""}</span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        ) : proposals.length === 0 ? (
          <p className="text-xs text-slate-500">
            No agent proposals yet. Run an eval for an agent with W below the reflection threshold to generate proposals.
          </p>
        ) : (
          <div>
            {proposals.map((proposal) => (
              <ProposalRow key={proposal.id} proposal={proposal} />
            ))}
          </div>
        )}
      </section>

      <section className="border border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-500">Proposal Types</span>
          <div className="h-px flex-1 bg-amber-900/40" />
        </div>
        <div className="flex flex-col gap-1.5 text-xs text-slate-400">
          <div><TypeBadge type="agent_instruction_patch" /> <span className="ml-2">Edits the agent system prompt / operating instructions</span></div>
          <div><TypeBadge type="skill_addition" /> <span className="ml-2">Registers a new skill when a capability gap is observed</span></div>
          <div><TypeBadge type="tool_routing_update" /> <span className="ml-2">Adjusts tool preference weight for a context pattern</span></div>
        </div>
      </section>
    </div>
  );
}
