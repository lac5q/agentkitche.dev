"use client";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { STATUS_COLORS } from "@/lib/constants";

interface HealthDotProps {
  service: string;
  status: "up" | "degraded" | "down";
  latencyMs: number | null;
  detail?: string;
}

export function HealthDot({ service, status, latencyMs, detail }: HealthDotProps) {
  const color = STATUS_COLORS[status];
  const statusText = `${service}: ${status}${latencyMs !== null ? ` (${latencyMs}ms)` : ""}`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="flex shrink-0 items-center gap-1.5">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: color, boxShadow: status === "up" ? `0 0 6px ${color}` : undefined }}
          />
          <span className="hidden text-xs text-slate-500 sm:inline">{service}</span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{statusText}</p>
          {detail && <p className="max-w-64 text-xs text-slate-300">{detail}</p>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
