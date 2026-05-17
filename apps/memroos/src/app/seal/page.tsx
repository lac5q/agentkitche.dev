"use client";

import { ApprovalQueuePanel } from "@/components/seal/approval-queue-panel";
import { AuditLogPanel } from "@/components/seal/audit-log-panel";

export default function SealPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-500">SEAL</h1>
        <p className="mt-1 text-sm text-slate-400">
          Self-improvement substrate — proposal approval queue and audit trail
        </p>
      </div>

      <ApprovalQueuePanel />
      <AuditLogPanel />
    </div>
  );
}
