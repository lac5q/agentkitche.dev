"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { PLATFORM_LABELS } from "@/lib/constants";
import type { RegisteredAgent } from "@/types";

interface AgentRegistryDrawerProps {
  agent: RegisteredAgent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentRegistryDrawer({ agent, open, onOpenChange }: AgentRegistryDrawerProps) {
  if (!agent) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-md">
        <SheetHeader className="border-b border-slate-800 pb-4">
          <SheetTitle className="text-slate-100">{agent.name}</SheetTitle>
          <SheetDescription className="text-slate-400">{agent.role}</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 p-4 text-sm">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="border-slate-700 text-slate-300">{agent.protocol}</Badge>
            <Badge variant="outline" className="border-slate-700 text-slate-300">
              {PLATFORM_LABELS[agent.platform] ?? agent.platform}
            </Badge>
            <Badge variant="outline" className="border-slate-700 text-slate-300">{agent.status}</Badge>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Last heartbeat</p>
            <p className="text-slate-200">{agent.lastHeartbeat ?? "never"}</p>
          </div>
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Capabilities</p>
            <div className="flex flex-wrap gap-2">
              {agent.capabilities.length === 0 ? (
                <span className="text-slate-500">None declared</span>
              ) : (
                agent.capabilities.map((capability) => (
                  <Badge key={capability.id} variant="outline" className="border-slate-700 text-slate-300">
                    {capability.name}
                  </Badge>
                ))
              )}
            </div>
          </div>
          {agent.currentTask && (
            <div>
              <p className="mb-1 text-xs uppercase tracking-wide text-slate-500">Current task</p>
              <p className="text-slate-200">{agent.currentTask}</p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
