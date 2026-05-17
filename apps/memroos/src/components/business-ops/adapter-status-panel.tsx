"use client";

import type { BusinessOutcomeEventRow } from "@/lib/api-client";
import { useBusinessOutcomeEvents } from "@/lib/api-client";

const KNOWN_ADAPTERS = [
  { name: "hubspot", category: "CRM", live: true },
  { name: "intercom", category: "Helpdesk", live: true },
  { name: "quickbooks", category: "Finance", live: true },
  { name: "salesforce", category: "CRM", live: false },
  { name: "zendesk", category: "Helpdesk", live: false },
  { name: "netsuite", category: "Finance", live: false },
] as const;

export function AdapterStatusPanel() {
  const { data, isLoading } = useBusinessOutcomeEvents({ limit: 500 });

  const eventsByAdapter = (data?.events ?? []).reduce<Record<string, { count: number; lastPolled: string }>>((acc, event: BusinessOutcomeEventRow) => {
    const adapter = event.adapter;
    if (!acc[adapter]) {
      acc[adapter] = { count: 0, lastPolled: event.polledAt };
    }
    acc[adapter].count++;
    if (event.polledAt > acc[adapter].lastPolled) {
      acc[adapter].lastPolled = event.polledAt;
    }
    return acc;
  }, {});

  return (
    <div className="rounded-sm border border-[#c9c9c2] bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-[#0f0f0e]">Adapter Status</h3>
      {isLoading ? (
        <p className="text-xs text-[#73736b]">Loading...</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#e4e4dd] text-left text-[#73736b]">
              <th className="pb-1.5 font-medium">Adapter</th>
              <th className="pb-1.5 font-medium">Category</th>
              <th className="pb-1.5 font-medium">Mode</th>
              <th className="pb-1.5 font-medium text-right">Events</th>
              <th className="pb-1.5 font-medium text-right">Last Polled</th>
            </tr>
          </thead>
          <tbody>
            {KNOWN_ADAPTERS.map((adapter) => {
              const stats = eventsByAdapter[adapter.name];
              return (
                <tr key={adapter.name} className="border-b border-[#f2f2ee]">
                  <td className="py-1.5 font-medium text-[#0f0f0e]">{adapter.name}</td>
                  <td className="py-1.5 text-[#4a4a45]">{adapter.category}</td>
                  <td className="py-1.5">
                    <span
                      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        adapter.live
                          ? "bg-green-50 text-green-700"
                          : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {adapter.live ? "live" : "fixture"}
                    </span>
                  </td>
                  <td className="py-1.5 text-right text-[#4a4a45]">
                    {stats?.count ?? 0}
                  </td>
                  <td className="py-1.5 text-right text-[#73736b]">
                    {stats?.lastPolled
                      ? new Date(stats.lastPolled).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
