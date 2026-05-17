"use client";

import { MemroosFallback } from "@/components/system/memroos-fallback";

export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4">
      <MemroosFallback
        eyebrow="Route failure"
        title="This workflow could not finish."
        message="Something inside this route failed while the workspace was still running. Try the route again, or open the workflow map to inspect system health."
        code="500"
        primaryHref="/flow"
        primaryLabel="Open Workflow Map"
        secondaryHref="/"
        secondaryLabel="Overview"
      />
      <button
        onClick={reset}
        className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/20"
      >
        Retry this route
      </button>
    </div>
  );
}
