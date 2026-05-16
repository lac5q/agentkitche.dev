"use client";

import { useSealAuditLog } from "@/lib/api-client";
import type { SealAuditLogEntry } from "@/lib/api-client";

function EventBadge({ event }: { event: SealAuditLogEntry["event"] }) {
  const styles: Record<SealAuditLogEntry["event"], string> = {
    proposed: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    rejected: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    apply_started: "border-sky-500/40 bg-sky-500/10 text-sky-300",
    apply_succeeded: "border-sky-500/40 bg-sky-500/10 text-sky-300",
    apply_failed: "border-orange-500/40 bg-orange-500/10 text-orange-300",
    rolled_back: "border-slate-500/40 bg-slate-500/10 text-slate-400",
  };
  return (
    <span
      className={`rounded border px-2 py-0.5 text-[10px] font-semibold uppercase ${styles[event]}`}
    >
      {event.replace(/_/g, " ")}
    </span>
  );
}

function DeltaCell({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-600">—</span>;
  const positive = value >= 0;
  return (
    <span
      className={`font-mono text-xs ${positive ? "text-emerald-400" : "text-rose-400"}`}
    >
      {positive ? "+" : ""}
      {value.toFixed(4)}
    </span>
  );
}

function AuditRow({ entry }: { entry: SealAuditLogEntry }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 py-2 text-xs last:border-0">
      <EventBadge event={entry.event} />
      <span className="w-24 shrink-0 truncate font-mono text-slate-500" title={entry.proposalId}>
        {entry.proposalId.slice(0, 8)}
      </span>
      <span className="flex items-center gap-1 text-slate-500">
        W<sub>base</sub>: <DeltaCell value={entry.baselineW} />
      </span>
      <span className="flex items-center gap-1 text-slate-500">
        W<sub>post</sub>: <DeltaCell value={entry.postApplyW} />
      </span>
      <span className="flex items-center gap-1 text-slate-500">
        &Delta;: <DeltaCell value={entry.deltaComposite} />
      </span>
      <span className="ml-auto shrink-0 text-slate-600">
        {new Date(entry.timestamp).toLocaleString()}
      </span>
    </div>
  );
}

export function AuditLogPanel() {
  const { data, isLoading } = useSealAuditLog();
  const entries = data?.entries ?? [];

  return (
    <section className="border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-amber-500">
          Audit Log
        </span>
        <div className="h-px flex-1 bg-amber-900/40" />
        <span className="text-xs text-slate-500">{entries.length} events</span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-xs text-slate-500">No audit events yet.</p>
      ) : (
        <div>
          {entries.map((entry) => (
            <AuditRow key={entry.id} entry={entry} />
          ))}
        </div>
      )}
    </section>
  );
}
