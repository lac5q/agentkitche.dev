"use client";
import { useAgents } from "@/lib/api-client";
import { SummaryBar } from "@/components/kitchen/summary-bar";
import { AgentGrid } from "@/components/kitchen/agent-grid";
import { HiveFeed } from "@/components/kitchen/hive-feed";
import { AgentPeersPanel } from "@/components/kitchen/agent-peers-panel";
import { AuditLogPanel } from "@/components/kitchen/audit-log-panel";
import { VoicePanel } from "@/components/voice/VoicePanel";
import { AgentCardsPanel } from "@/components/dispatch/agent-cards-panel";
import { InfoTip } from "@/components/ui/info-tip";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Agent, RegisteredAgent } from "@/types";

function section(title: string, agents: RegisteredAgent[]) {
  return agents.length > 0 ? [{ title, agents: agents as Agent[] }] : [];
}

export default function KitchenFloor() {
  const { data, isLoading } = useAgents();
  const allAgents = (data?.agents || []) as RegisteredAgent[];
  const activeAgents = allAgents.filter((a) => a.status === "active");
  const remoteAgents = allAgents.filter((a) => a.location && a.location !== "local");
  const localAgents = allAgents.filter((a) => !a.location || a.location === "local");
  const dormantAgents = allAgents.filter((a) => a.status !== "active");

  const active = activeAgents.length;
  const errors = allAgents.filter((a) => a.status === "error").length;
  const tasks = allAgents.filter((a) => a.currentTask).length;

  return (
    <TooltipProvider>
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center text-2xl font-bold text-amber-500">
          The Kitchen Floor
          <InfoTip text="Real-time status board for canonical registered agents. Data refreshes automatically via the agents API." />
        </h1>
        <p className="text-sm text-slate-400">Real-time agent status board</p>
      </div>
      <SummaryBar total={allAgents.length} active={active} tasks={tasks} errors={errors} />
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      ) : (
        <AgentGrid
          sections={[
            ...section("Active Agents", activeAgents),
            ...section("Remote-Capable Agents", remoteAgents),
            ...section("Local Agents", localAgents),
            ...section("Dormant or Idle Agents", dormantAgents),
          ]}
        />
      )}
      <HiveFeed />
      <AgentCardsPanel />
      <AgentPeersPanel />
      <AuditLogPanel />
      <VoicePanel />
    </div>
    </TooltipProvider>
  );
}
