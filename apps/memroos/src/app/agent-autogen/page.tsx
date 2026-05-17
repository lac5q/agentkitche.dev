"use client";

import { AgentProposalsPanel } from "@/components/agents/agent-proposals-panel";

export default function AgentAutogenPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-500">Agent Autogen</h1>
        <p className="mt-1 text-sm text-slate-400">
          Agent self-improvement proposals — instruction patches, skill additions, and tool routing updates
        </p>
      </div>

      <AgentProposalsPanel />
    </div>
  );
}
