"use client";

import { useSecurityCapabilities } from "@/lib/api-client";

function modeClass(mode: string): string {
  if (mode === "strict") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
  if (mode === "permissive") return "border-amber-500/30 bg-amber-500/10 text-amber-300";
  return "border-sky-500/30 bg-sky-500/10 text-sky-300";
}

export function AgentSecurityModesPanel() {
  const { data, isLoading } = useSecurityCapabilities();
  const agents = data?.agents ?? [];

  return (
    <div className="border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-amber-500">
          Security Modes
        </span>
        <div className="h-px flex-1 bg-amber-900/40" />
        {data?.policies.defaultMode && (
          <span className="text-xs text-slate-500">default {data.policies.defaultMode}</span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="grid grid-cols-2 gap-3">
            <div className="border border-slate-800 bg-slate-950/30 p-3">
              <p className="text-xs text-slate-500">Strict Agents</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-300">{data?.summary.strictAgents ?? 0}</p>
            </div>
            <div className="border border-slate-800 bg-slate-950/30 p-3">
              <p className="text-xs text-slate-500">Security Caps</p>
              <p className="mt-1 text-2xl font-semibold text-sky-300">
                {data?.summary.agentsWithSecurityCapabilities ?? 0}
              </p>
            </div>
            <div className="col-span-2 border border-slate-800 bg-slate-950/30 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Policies</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-300">
                  dispatch {data?.policies.dispatchPolicy ?? "unknown"}
                </span>
                <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-300">
                  a2a {data?.policies.a2aPolicy ?? "unknown"}
                </span>
                <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-emerald-300">
                  memory {data?.policies.memoryWritePolicy ?? "unknown"}
                </span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden border border-slate-800 bg-slate-950/30">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-slate-800 px-3 py-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <span>Agent</span>
              <span>Mode</span>
              <span>Ready</span>
            </div>
            <div className="max-h-64 overflow-auto">
              {agents.length === 0 ? (
                <p className="p-5 text-center text-sm text-slate-500">No registered agents yet.</p>
              ) : (
                agents.map((agent) => (
                  <div key={agent.id} className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-slate-800/70 px-3 py-2 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-200">{agent.name}</p>
                      <p className="truncate text-xs text-slate-500">{agent.role} - {agent.protocol}</p>
                    </div>
                    <span className={`self-center rounded border px-2 py-0.5 text-xs ${modeClass(agent.securityMode)}`}>
                      {agent.securityMode}
                    </span>
                    <span className="self-center tabular-nums text-sm text-slate-300">{agent.readinessScore}%</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
