"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PLATFORM_LABELS, STATUS_COLORS } from "@/lib/constants";
import type { RegisteredAgent } from "@/types";

interface AgentRegistryTableProps {
  agents: RegisteredAgent[];
  onSelect: (agent: RegisteredAgent) => void;
  onDeregister: (agentId: string) => void;
  isDeregistering?: boolean;
}

function formatHeartbeat(value: string | null): string {
  if (!value) return "never";
  return new Date(value).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

export function AgentRegistryTable({
  agents,
  onSelect,
  onDeregister,
  isDeregistering = false,
}: AgentRegistryTableProps) {
  if (agents.length === 0) {
    return (
      <div className="border border-slate-800 bg-slate-900/40 px-4 py-10 text-center text-sm text-slate-500">
        No registered agents match this view.
      </div>
    );
  }

  return (
    <div className="overflow-hidden border border-slate-800 bg-slate-900/40">
      <div className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_1fr_1fr_0.6fr] border-b border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <span>Agent</span>
        <span>Protocol</span>
        <span>Platform</span>
        <span>Status</span>
        <span>Last Heartbeat</span>
        <span>Capabilities</span>
        <span className="text-right">Action</span>
      </div>
      {agents.map((agent) => (
        <div
          key={agent.id}
          className="grid grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_1fr_1fr_0.6fr] items-center border-b border-slate-800/70 px-3 py-3 text-sm last:border-b-0 hover:bg-slate-800/40"
        >
          <button
            className="min-w-0 text-left"
            onClick={() => onSelect(agent)}
          >
            <span className="block truncate font-medium text-slate-100">{agent.name}</span>
            <span className="block truncate text-xs text-slate-500">{agent.role}</span>
          </button>
          <span className="text-slate-300">{agent.protocol}</span>
          <span className="text-slate-300">{PLATFORM_LABELS[agent.platform] ?? agent.platform}</span>
          <span style={{ color: STATUS_COLORS[agent.status] }}>{agent.status}</span>
          <span className="text-xs text-slate-400">{formatHeartbeat(agent.lastHeartbeat)}</span>
          <div className="flex min-w-0 flex-wrap gap-1">
            {agent.capabilities.slice(0, 2).map((capability) => (
              <Badge key={capability.id} variant="outline" className="border-slate-700 text-slate-300">
                {capability.name}
              </Badge>
            ))}
            {agent.capabilities.length > 2 && (
              <Badge variant="outline" className="border-slate-700 text-slate-500">
                +{agent.capabilities.length - 2}
              </Badge>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              variant="destructive"
              size="sm"
              disabled={isDeregistering}
              onClick={() => onDeregister(agent.id)}
            >
              Deregister
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
