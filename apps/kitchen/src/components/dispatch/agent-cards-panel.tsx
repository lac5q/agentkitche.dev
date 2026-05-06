"use client";

import { useAgentCards, useAgents } from "@/lib/api-client";
import { PLATFORM_LABELS } from "@/lib/constants";

export function AgentCardsPanel() {
  const { data, isLoading } = useAgentCards();
  const { data: agentsData, isLoading: agentsLoading } = useAgents();
  const cards = data?.cards ?? [];
  const agents = agentsData?.agents ?? [];
  const isLoadingAny = isLoading || agentsLoading;
  const cardAgentIds = new Set(cards.map((card) => card.extensions.kitchen.id));
  const agentsWithoutCards = agents.filter((agent) => !cardAgentIds.has(agent.id));

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-amber-500">A2A Agent Cards</h2>
          <p className="mt-1 text-xs text-slate-500">
            {agents.length} dispatch agent{agents.length === 1 ? "" : "s"} registered
          </p>
        </div>
        {cards.length > 0 && (
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-300">
            {cards.length} A2A
          </span>
        )}
      </div>
      {isLoadingAny && <p className="text-slate-500 text-sm animate-pulse">Loading…</p>}
      {!isLoadingAny && cards.length === 0 && agents.length === 0 && (
        <p className="text-slate-600 text-sm">No dispatch agents registered.</p>
      )}
      {!isLoadingAny && cards.length === 0 && agents.length > 0 && (
        <p className="mb-4 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-400">
          No A2A cards are registered yet. Dispatch can still target the REST/local agents below.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.extensions.kitchen.id}
            className="rounded-lg border border-slate-700 bg-slate-950 p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-slate-200">
                  <span className="text-slate-500 font-normal">
                    {PLATFORM_LABELS[card.extensions.kitchen.platform] ?? card.extensions.kitchen.platform}
                    {" → "}
                  </span>
                  {card.name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{card.extensions.kitchen.role}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 break-all">{card.url}</p>
            {card.skills.length > 0 && (
              <div>
                <p className="text-xs text-slate-600 mb-1">Skills</p>
                <div className="flex flex-wrap gap-1">
                  {card.skills.map((s) => (
                    <span
                      key={s.id}
                      className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded"
                      title={s.description}
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="text-xs text-slate-600">
              auth: {card.authentication.schemes.join(", ")} · v{card.version}
            </div>
          </div>
        ))}
      </div>
      {!isLoadingAny && agentsWithoutCards.length > 0 && (
        <div className="mt-5 border-t border-slate-800 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Registered Dispatch Agents
          </p>
          <div className="space-y-2">
            {agentsWithoutCards.map((agent) => (
              <div
                key={agent.id}
                className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-200">
                      <span className="font-normal text-slate-500">
                        {PLATFORM_LABELS[agent.platform] ?? agent.platform}
                        {" → "}
                      </span>
                      {agent.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{agent.role}</p>
                  </div>
                  <span className="rounded-full border border-slate-700 px-2 py-0.5 text-xs uppercase text-slate-400">
                    {agent.protocol}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
                  <span>{agent.status}</span>
                  <span>·</span>
                  <span>{agent.capabilities.length} capabilities</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
