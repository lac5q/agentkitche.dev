"use client";

import { useState, useCallback } from "react";
import { useAuditEntries, useAuditExportUrl } from "@/lib/api-client";
import type { AuditEntriesFilter } from "@/lib/api-client";
import { AUDIT_EVENT_TYPES } from "@/lib/audit/event-types";
import type { AuditEntry } from "@/lib/audit/schema";

const ALL_EVENT_TYPES = Object.values(AUDIT_EVENT_TYPES);

function formatTimestamp(ts: string): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return "";
  return s.length > n ? s.slice(0, n) + "…" : s;
}

function AuditRow({ entry }: { entry: AuditEntry }) {
  return (
    <tr className="border-b border-[#e4e4dd] hover:bg-[#f9f9f6]">
      <td className="py-2 px-3 text-xs text-[#4a4a45] whitespace-nowrap">
        {formatTimestamp(entry.created_at)}
      </td>
      <td className="py-2 px-3 text-xs font-mono text-[#0f0f0e] max-w-[120px] truncate" title={entry.actor_id}>
        {entry.actor_id}
      </td>
      <td className="py-2 px-3">
        <span className="inline-block rounded px-1.5 py-0.5 text-[11px] font-semibold bg-[#e4e4dd] text-[#4a4a45]">
          {entry.event_type}
        </span>
      </td>
      <td className="py-2 px-3 text-xs text-[#4a4a45]">{entry.entity_type}</td>
      <td className="py-2 px-3 text-xs font-mono text-[#4a4a45] max-w-[150px] truncate" title={entry.entity_id}>
        {entry.entity_id}
      </td>
      <td className="py-2 px-3 text-xs text-[#4a4a45] max-w-[200px]" title={entry.reason ?? ""}>
        {truncate(entry.reason, 80)}
      </td>
    </tr>
  );
}

export default function AuditPage() {
  const [filter, setFilter] = useState<AuditEntriesFilter>({ limit: 50 });
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [allEntries, setAllEntries] = useState<AuditEntry[]>([]);
  const [agentInput, setAgentInput] = useState("");
  const [actorInput, setActorInput] = useState("");
  const [selectedEventType, setSelectedEventType] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const queryFilter: AuditEntriesFilter = {
    ...filter,
    cursor,
    agentId: agentInput || undefined,
    actorId: actorInput || undefined,
    eventType: selectedEventType.length === 1 ? selectedEventType[0] : undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
  };

  const { data, isLoading, isError } = useAuditEntries(queryFilter);
  const ndjsonUrl = useAuditExportUrl(filter, "ndjson");
  const csvUrl = useAuditExportUrl(filter, "csv");

  const applyFilter = useCallback(() => {
    setAllEntries([]);
    setCursor(undefined);
  }, []);

  const loadMore = useCallback(() => {
    if (data?.nextCursor) {
      setAllEntries((prev) => [...prev, ...(data.entries ?? [])]);
      setCursor(data.nextCursor);
    }
  }, [data]);

  const displayed = cursor ? allEntries : (data?.entries ?? []);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f0f0e]">Audit Log</h1>
        <p className="mt-1 text-sm text-[#73736b]">Immutable decision history — every agent action, SEAL proposal, and eval run</p>
      </div>

      <div className="flex gap-4 flex-wrap">
        {/* Filter sidebar */}
        <aside className="w-64 shrink-0 space-y-4 rounded-lg border border-[#c9c9c2] bg-[#f9f9f6] p-4">
          <h2 className="text-sm font-semibold text-[#0f0f0e]">Filters</h2>

          <div>
            <label className="block text-xs text-[#4a4a45] mb-1">Agent ID</label>
            <input
              className="w-full rounded border border-[#c9c9c2] px-2 py-1 text-sm"
              value={agentInput}
              onChange={(e) => setAgentInput(e.target.value)}
              placeholder="agent-id"
            />
          </div>

          <div>
            <label className="block text-xs text-[#4a4a45] mb-1">Actor ID</label>
            <input
              className="w-full rounded border border-[#c9c9c2] px-2 py-1 text-sm"
              value={actorInput}
              onChange={(e) => setActorInput(e.target.value)}
              placeholder="user or system"
            />
          </div>

          <div>
            <label className="block text-xs text-[#4a4a45] mb-1">Event Type</label>
            <select
              className="w-full rounded border border-[#c9c9c2] px-2 py-1 text-sm"
              multiple
              value={selectedEventType}
              onChange={(e) =>
                setSelectedEventType(
                  Array.from(e.target.selectedOptions).map((o) => o.value)
                )
              }
              size={6}
            >
              {ALL_EVENT_TYPES.map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-[#4a4a45] mb-1">From</label>
            <input
              type="datetime-local"
              className="w-full rounded border border-[#c9c9c2] px-2 py-1 text-sm"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-[#4a4a45] mb-1">To</label>
            <input
              type="datetime-local"
              className="w-full rounded border border-[#c9c9c2] px-2 py-1 text-sm"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>

          <button
            onClick={applyFilter}
            className="w-full rounded bg-[#7a2a1e] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#a8392c]"
          >
            Apply Filters
          </button>
        </aside>

        {/* Main table area */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#4a4a45]">
              {isLoading ? "Loading…" : `${displayed.length} entries`}
            </span>
            <div className="flex gap-2">
              <a
                href={ndjsonUrl}
                download
                className="rounded border border-[#c9c9c2] px-3 py-1 text-xs font-medium text-[#4a4a45] hover:bg-[#e4e4dd]"
              >
                Export NDJSON
              </a>
              <a
                href={csvUrl}
                download
                className="rounded border border-[#c9c9c2] px-3 py-1 text-xs font-medium text-[#4a4a45] hover:bg-[#e4e4dd]"
              >
                Export CSV
              </a>
            </div>
          </div>

          {isError && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              Failed to load audit entries. You may not have access or be logged in.
            </div>
          )}

          <div className="overflow-x-auto rounded-lg border border-[#c9c9c2] bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[#c9c9c2] bg-[#f9f9f6]">
                  <th className="py-2 px-3 text-left text-xs font-semibold text-[#4a4a45]">Timestamp</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold text-[#4a4a45]">Actor</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold text-[#4a4a45]">Event Type</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold text-[#4a4a45]">Entity Type</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold text-[#4a4a45]">Entity ID</th>
                  <th className="py-2 px-3 text-left text-xs font-semibold text-[#4a4a45]">Reason</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((entry) => (
                  <AuditRow key={entry.id} entry={entry} />
                ))}
                {displayed.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-[#73736b]">
                      No audit entries found for the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {data?.nextCursor && (
            <div className="flex justify-center">
              <button
                onClick={loadMore}
                className="rounded border border-[#c9c9c2] px-4 py-1.5 text-sm font-medium text-[#4a4a45] hover:bg-[#e4e4dd]"
              >
                Load more
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
