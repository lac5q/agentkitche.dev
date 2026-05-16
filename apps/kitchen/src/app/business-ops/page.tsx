"use client";

import { useState } from "react";
import { AdapterStatusPanel } from "@/components/business-ops/adapter-status-panel";
import { KpiTimelinePanel } from "@/components/business-ops/kpi-timeline-panel";
import { useAgents } from "@/lib/api-client";

export default function BusinessOpsPage() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | undefined>(undefined);
  const { data: agentsData } = useAgents();
  const agents = agentsData?.agents ?? [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0f0f0e]">Business Ops</h1>
        <p className="mt-1 text-sm text-[#73736b]">
          Post-hoc business outcome signals — per-agent W timeline with L1/L2/L3 breakdown
          and adapter poll status.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-[#0f0f0e]" htmlFor="agent-select">
          Agent
        </label>
        <select
          id="agent-select"
          className="rounded-sm border border-[#c9c9c2] bg-white px-2 py-1.5 text-sm text-[#0f0f0e] focus:outline-none focus:ring-1 focus:ring-[#a8392c]"
          value={selectedAgentId ?? ""}
          onChange={(e) => setSelectedAgentId(e.target.value || undefined)}
        >
          <option value="">All agents</option>
          {agents.map((agent) => (
            <option key={agent.id} value={agent.id}>
              {agent.name ?? agent.id}
            </option>
          ))}
        </select>
      </div>

      <KpiTimelinePanel agentId={selectedAgentId} />

      <AdapterStatusPanel />
    </div>
  );
}
