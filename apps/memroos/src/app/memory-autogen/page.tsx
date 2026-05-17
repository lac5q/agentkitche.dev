"use client";

import { MemoryProposalsPanel } from "@/components/memory/memory-proposals-panel";
import { PolicyLabPanel } from "@/components/memory/policy-lab-panel";

export default function MemoryAutogenPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-violet-400">Memory</h1>
        <p className="mt-1 text-sm text-slate-400">
          Memory autogen learnings — typed proposals and policy lab ranking
        </p>
      </div>

      <MemoryProposalsPanel />
      <PolicyLabPanel />
    </div>
  );
}
