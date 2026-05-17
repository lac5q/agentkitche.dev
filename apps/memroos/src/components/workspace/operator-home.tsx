"use client";

import { useAgents } from "@/lib/api-client";
import { SummaryBar } from "@/components/memroos/summary-bar";
import { AgentGrid } from "@/components/memroos/agent-grid";
import { HiveFeed } from "@/components/memroos/hive-feed";
import { AgentPeersPanel } from "@/components/memroos/agent-peers-panel";
import { AuditLogPanel } from "@/components/memroos/audit-log-panel";
import { AgentCardsPanel } from "@/components/dispatch/agent-cards-panel";
import { InfoTip } from "@/components/ui/info-tip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PLATFORM_LABELS } from "@/lib/constants";
import type { Agent, RegisteredAgent } from "@/types";

interface AgentsResponseExtras {
  localRuntime?: {
    activeCliCount: number;
  };
}

function section(title: string, agents: RegisteredAgent[]) {
  return agents.length > 0 ? [{ title, agents: agents as Agent[] }] : [];
}

function runtimeLabel(agent: RegisteredAgent): string {
  return PLATFORM_LABELS[agent.platform] ?? agent.platform;
}

function buildHierarchySections(agents: RegisteredAgent[]) {
  const byId = new Map(agents.map((agent) => [agent.id, agent]));
  const harnesses = agents.filter((agent) =>
    agents.some((candidate) => candidate.masterId === agent.id)
  );
  const subagents = agents.filter((agent) => agent.masterId);
  const standalone = agents.filter(
    (agent) => !agent.masterId && !agents.some((candidate) => candidate.masterId === agent.id)
  );

  const explicitSections = [
    ...section("Harnesses with Subagents", harnesses),
    ...section("Subagents by Harness", subagents.sort((a, b) => {
      const aHarness = byId.get(a.masterId ?? "")?.name ?? a.masterId ?? "";
      const bHarness = byId.get(b.masterId ?? "")?.name ?? b.masterId ?? "";
      return `${aHarness} ${a.name}`.localeCompare(`${bHarness} ${b.name}`);
    })),
    ...section("Standalone Agents", standalone),
  ];

  if (harnesses.length > 0 || subagents.length > 0) return explicitSections;

  return Object.entries(
    agents.reduce<Record<string, RegisteredAgent[]>>((groups, agent) => {
      const label = `${runtimeLabel(agent)} Runtime`;
      groups[label] = [...(groups[label] ?? []), agent];
      return groups;
    }, {})
  )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([title, groupedAgents]) => ({ title, agents: groupedAgents as Agent[] }));
}

function HarnessOverview({ agents }: { agents: RegisteredAgent[] }) {
  const byId = new Map(agents.map((agent) => [agent.id, agent]));
  const explicitSubagents = agents.filter((agent) => agent.masterId);
  const explicitHarnesses = agents.filter((agent) =>
    agents.some((candidate) => candidate.masterId === agent.id)
  );
  const runtimeGroups = Object.entries(
    agents.reduce<Record<string, RegisteredAgent[]>>((groups, agent) => {
      const label = runtimeLabel(agent);
      groups[label] = [...(groups[label] ?? []), agent];
      return groups;
    }, {})
  ).sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
            Runtime Map
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Explicit parent/child links use <span className="text-amber-400">masterId</span>. Runtime groups show which family each agent currently belongs to.
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="rounded-full border border-sky-700/70 bg-sky-500/10 px-2.5 py-1 text-sky-300">
            {explicitHarnesses.length} harnesses
          </span>
          <span className="rounded-full border border-amber-700/70 bg-amber-500/10 px-2.5 py-1 text-amber-300">
            {explicitSubagents.length} subagents
          </span>
        </div>
      </div>

      {explicitSubagents.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {explicitSubagents.map((agent) => {
            const harness = byId.get(agent.masterId ?? "");
            return (
              <div key={agent.id} className="rounded-xl border border-amber-900/50 bg-amber-500/5 p-3">
                <p className="text-xs uppercase tracking-[0.16em] text-amber-500">subagent</p>
                <p className="mt-1 font-semibold text-slate-100">{agent.name}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Harness: <span className="text-amber-300">{harness?.name ?? agent.masterId}</span>
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {runtimeGroups.map(([label, groupedAgents]) => (
            <div key={label} className="rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">runtime</p>
              <p className="mt-1 font-semibold text-slate-100">{label}</p>
              <p className="mt-1 text-xs text-slate-400">
                {groupedAgents.length} agent{groupedAgents.length === 1 ? "" : "s"} registered
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function OperatorHome() {
  const { data, isLoading } = useAgents();
  const allAgents = (data?.agents || []) as RegisteredAgent[];
  const activeAgents = allAgents.filter((a) => a.status === "active");
  const localRuntimeActive =
    ((data as (typeof data & AgentsResponseExtras) | undefined)?.localRuntime?.activeCliCount) ?? 0;
  const activeRegisteredRemote = activeAgents.filter((agent) => agent.isRemote || agent.location !== "local").length;
  const activeRegisteredLocal = activeAgents.length - activeRegisteredRemote;

  const active = activeRegisteredRemote + Math.max(activeRegisteredLocal, localRuntimeActive);
  const errors = allAgents.filter((a) => a.status === "error").length;
  const tasks = allAgents.filter((a) => a.currentTask).length;
  const hierarchySections = buildHierarchySections(allAgents);

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div>
          <h1 className="flex items-center text-2xl font-bold text-amber-500">
            Runtime Dashboard
            <InfoTip text="Real-time status board for canonical registered agents. Data refreshes automatically via the agents API." />
          </h1>
          <p className="text-sm text-slate-400">Agent status, runtime topology, activity, and audit visibility</p>
        </div>
        <SummaryBar
          total={allAgents.length}
          active={active}
          tasks={tasks}
          errors={errors}
          localRuntimeActive={localRuntimeActive}
        />
        {!isLoading && allAgents.length > 0 && <HarnessOverview agents={allAgents} />}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        ) : (
          <AgentGrid sections={hierarchySections} />
        )}
        <HiveFeed />
        <AgentCardsPanel />
        <AgentPeersPanel />
        <AuditLogPanel />
      </div>
    </TooltipProvider>
  );
}
