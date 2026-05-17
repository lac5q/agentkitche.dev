"use client";

import { useState } from "react";
import { useEscalations, useResolveEscalation } from "@/lib/api-client";
import type { EscalationWithCountdown } from "@/lib/api-client";

type TabStatus = "open" | "resolved" | "sla_breached" | "all";

function formatMs(ms: number): string {
  if (ms <= 0) return "Overdue";
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function EscalationCard({
  escalation,
  onResolve,
  canResolve,
}: {
  escalation: EscalationWithCountdown;
  onResolve: (id: string, note?: string) => void;
  canResolve: boolean;
}) {
  const [showModal, setShowModal] = useState(false);
  const [note, setNote] = useState("");
  const isOverdue = escalation.slaRemainingMs <= 0;
  const isResolved = escalation.status === "resolved";

  return (
    <div
      className={[
        "rounded-lg border p-4 space-y-2",
        isOverdue && !isResolved
          ? "border-red-300 bg-red-50"
          : "border-[#c9c9c2] bg-white",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold bg-[#e4e4dd] text-[#4a4a45]">
              {escalation.entity_type}
            </span>
            <span className="inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold bg-blue-100 text-blue-700">
              {escalation.escalation_type}
            </span>
            {isOverdue && !isResolved && (
              <span className="inline-block rounded px-1.5 py-0.5 text-[11px] font-bold bg-red-200 text-red-700">
                SLA BREACHED
              </span>
            )}
            <span
              className={[
                "inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold",
                escalation.status === "resolved"
                  ? "bg-green-100 text-green-700"
                  : escalation.status === "sla_breached"
                  ? "bg-red-100 text-red-700"
                  : "bg-yellow-100 text-yellow-700",
              ].join(" ")}
            >
              {escalation.status}
            </span>
          </div>
          <p className="text-xs font-mono text-[#4a4a45] truncate" title={escalation.entity_id}>
            {escalation.entity_id}
          </p>
        </div>

        <div className="text-right shrink-0">
          {!isResolved && (
            <div
              className={[
                "text-sm font-semibold",
                isOverdue ? "text-red-600" : "text-[#4a4a45]",
              ].join(" ")}
            >
              {formatMs(escalation.slaRemainingMs)}
            </div>
          )}
          <div className="text-xs text-[#73736b] mt-0.5">
            {isResolved ? "Resolved" : "SLA remaining"}
          </div>
        </div>
      </div>

      <div className="text-xs text-[#73736b]">
        Assigned to: {escalation.assigned_to ?? "Unassigned"} · Created: {formatTimestamp(escalation.created_at)}
      </div>

      {isResolved && escalation.resolution_note && (
        <div className="text-xs text-[#4a4a45] bg-[#f2f2ee] rounded px-2 py-1">
          Note: {escalation.resolution_note}
        </div>
      )}

      {!isResolved && canResolve && (
        <div>
          <button
            onClick={() => setShowModal(true)}
            className="rounded bg-[#7a2a1e] px-3 py-1 text-xs font-semibold text-white hover:bg-[#a8392c]"
          >
            Resolve
          </button>
        </div>
      )}

      {/* Resolve modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl space-y-3">
            <h3 className="font-semibold text-[#0f0f0e]">Resolve Escalation</h3>
            <div>
              <label className="block text-xs text-[#4a4a45] mb-1">Resolution note (optional)</label>
              <textarea
                className="w-full rounded border border-[#c9c9c2] px-2 py-1 text-sm resize-none"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Describe how this was resolved…"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="rounded border border-[#c9c9c2] px-3 py-1 text-sm text-[#4a4a45] hover:bg-[#e4e4dd]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onResolve(escalation.id, note || undefined);
                  setShowModal(false);
                  setNote("");
                }}
                className="rounded bg-[#7a2a1e] px-3 py-1 text-sm font-semibold text-white hover:bg-[#a8392c]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TABS: { label: string; value: TabStatus }[] = [
  { label: "Open", value: "open" },
  { label: "Resolved", value: "resolved" },
  { label: "All", value: "all" },
];

export default function EscalationsPage() {
  const [activeTab, setActiveTab] = useState<TabStatus>("open");
  const { data, isLoading, isError } = useEscalations({ status: activeTab });
  const resolveEscalation = useResolveEscalation();

  // TODO: Wire to real session role — for now assume operator for UI rendering
  // Phase 65 will connect the role from the session context provider
  const canResolve = true;

  function handleResolve(id: string, note?: string) {
    resolveEscalation.mutate({ id, note });
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f0f0e]">Escalations</h1>
        <p className="mt-1 text-sm text-[#73736b]">HIL queue — open items with SLA countdown, auto-refreshes every 30s</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[#c9c9c2]">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={[
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px",
              activeTab === tab.value
                ? "border-[#7a2a1e] text-[#7a2a1e]"
                : "border-transparent text-[#73736b] hover:text-[#0f0f0e]",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isError && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Failed to load escalations. You may not have access or be logged in.
        </div>
      )}

      {resolveEscalation.isError && (
        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Failed to resolve escalation: {(resolveEscalation.error as Error)?.message}
        </div>
      )}

      {isLoading && (
        <div className="text-sm text-[#73736b]">Loading escalations…</div>
      )}

      {!isLoading && (
        <div className="space-y-3">
          {(data?.escalations ?? []).length === 0 ? (
            <div className="rounded-lg border border-[#c9c9c2] bg-white p-8 text-center text-sm text-[#73736b]">
              No {activeTab === "all" ? "" : activeTab} escalations found.
            </div>
          ) : (
            (data?.escalations ?? []).map((escalation) => (
              <EscalationCard
                key={escalation.id}
                escalation={escalation}
                onResolve={handleResolve}
                canResolve={canResolve && escalation.status !== "resolved"}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
