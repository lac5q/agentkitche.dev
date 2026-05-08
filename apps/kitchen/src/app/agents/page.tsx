"use client";

import { useMemo, useState } from "react";
import {
  useCreateAgentOnboardingInviteMutation,
  useDeregisterAgentMutation,
  useRegisterA2aAgentCardMutation,
  useRegisterAgentMutation,
  useRegisteredAgents,
} from "@/lib/api-client";
import { AgentRegistryDrawer } from "@/components/agents/agent-registry-drawer";
import { AgentRegistrationForm } from "@/components/agents/agent-registration-form";
import { AgentRegistryTable } from "@/components/agents/agent-registry-table";
import { Button } from "@/components/ui/button";
import type { AgentProtocol, AgentStatus, RegisteredAgent } from "@/types";

type ProtocolFilter = "all" | AgentProtocol;
type StatusFilter = "all" | AgentStatus;

function formatAgentOnboardingPrompt(command: string) {
  return [
    "Run this Agent Kitchen onboarding command exactly as written.",
    "It will register you, save your per-agent credentials, and install the Agent Kitchen MCP server for your runtime.",
    "After it finishes, tell me whether it succeeded and include the onboarding report path it printed.",
    "",
    "Command to run:",
    "```bash",
    command,
    "```",
  ].join("\n");
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall back to the selection API below for non-secure origins or denied clipboard access.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  try {
    return document.execCommand?.("copy") ?? false;
  } catch {
    return false;
  } finally {
    document.body.removeChild(textarea);
  }
}

export default function AgentRegistryPage() {
  const { data, isLoading } = useRegisteredAgents();
  const registerMutation = useRegisterAgentMutation();
  const registerA2aMutation = useRegisterA2aAgentCardMutation();
  const inviteMutation = useCreateAgentOnboardingInviteMutation();
  const deregisterMutation = useDeregisterAgentMutation();
  const [protocol, setProtocol] = useState<ProtocolFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [selected, setSelected] = useState<RegisteredAgent | null>(null);
  const [oneTimeKey, setOneTimeKey] = useState<string | null>(null);
  const [inviteCommand, setInviteCommand] = useState<string | null>(null);
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);

  const agents = useMemo(
    () => (data?.agents ?? []) as RegisteredAgent[],
    [data?.agents]
  );
  const filtered = useMemo(
    () =>
      agents.filter((agent) =>
        (protocol === "all" || agent.protocol === protocol) &&
        (status === "all" || agent.status === status)
      ),
    [agents, protocol, status]
  );

  const activeCount = agents.filter((agent) => agent.status === "active").length;
  const protocolCount = new Set(agents.map((agent) => agent.protocol)).size;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-500">Hire Crew</h1>
        <p className="mt-1 text-sm text-slate-400">
          Agent registry, REST keys, capabilities, and liveness
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs text-slate-500">Registered</p>
          <p className="text-2xl font-bold text-slate-100">{agents.length}</p>
        </div>
        <div className="border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs text-slate-500">Active</p>
          <p className="text-2xl font-bold text-emerald-500">{activeCount}</p>
        </div>
        <div className="border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-xs text-slate-500">Protocols</p>
          <p className="text-2xl font-bold text-sky-500">{protocolCount}</p>
        </div>
      </div>

      <AgentRegistrationForm
        isSubmitting={registerMutation.isPending || registerA2aMutation.isPending}
        onSubmit={(input) =>
          registerMutation.mutate(input, {
            onSuccess: (result) => setOneTimeKey(result.apiKey ?? null),
          })
        }
        onA2aSubmit={(input) =>
          registerA2aMutation.mutate(input, {
            onSuccess: (result) => setOneTimeKey(result.apiKey ?? null),
          })
        }
        onCreateInvite={(input) => {
          setInviteStatus(null);
          inviteMutation.mutate(input, {
            onSuccess: async (result) => {
              const prompt = formatAgentOnboardingPrompt(result.command);
              setInviteCommand(prompt);
              if (await copyTextToClipboard(prompt)) {
                setInviteStatus("Onboarding prompt copied to clipboard.");
              } else {
                setInviteStatus("Invite created. Copy it from the box below.");
              }
            },
            onError: (error) => {
              setInviteStatus(error instanceof Error ? error.message : "Invite creation failed.");
            },
          });
        }}
        isCreatingInvite={inviteMutation.isPending}
      />

      {oneTimeKey && (
        <div className="border border-amber-500/30 bg-amber-500/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-400">One-time API key</p>
          <code className="mt-1 block break-all text-sm text-amber-100">{oneTimeKey}</code>
        </div>
      )}

      {(inviteCommand || inviteStatus) && (
        <div className="border border-sky-500/30 bg-sky-500/10 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-300">Generic onboarding invite</p>
            {inviteCommand && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (await copyTextToClipboard(inviteCommand)) {
                    setInviteStatus("Onboarding prompt copied to clipboard.");
                  } else {
                    setInviteStatus("Clipboard unavailable. Copy it from the box below.");
                  }
                }}
              >
                Copy
              </Button>
            )}
          </div>
          {inviteStatus && <p className="mt-1 text-xs text-sky-100">{inviteStatus}</p>}
          {inviteCommand && <pre className="mt-2 whitespace-pre-wrap break-words text-sm text-sky-50">{inviteCommand}</pre>}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(["all", "rest", "a2a", "ui", "local"] as ProtocolFilter[]).map((item) => (
          <button
            key={item}
            className={`border px-3 py-1 text-sm ${protocol === item ? "border-amber-500 text-amber-400" : "border-slate-800 text-slate-400"}`}
            onClick={() => setProtocol(item)}
          >
            {item}
          </button>
        ))}
        {(["all", "active", "idle", "dormant", "error"] as StatusFilter[]).map((item) => (
          <button
            key={item}
            className={`border px-3 py-1 text-sm ${status === item ? "border-amber-500 text-amber-400" : "border-slate-800 text-slate-400"}`}
            onClick={() => setStatus(item)}
          >
            {item}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
        </div>
      ) : (
        <AgentRegistryTable
          agents={filtered}
          onSelect={setSelected}
          onDeregister={(agentId) => deregisterMutation.mutate(agentId)}
          isDeregistering={deregisterMutation.isPending}
        />
      )}

      <AgentRegistryDrawer
        agent={selected}
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </div>
  );
}
