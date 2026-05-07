"use client";

import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger
        aria-label="More information"
        className="ml-1.5 inline-flex items-center text-slate-600 transition-colors hover:text-slate-400"
      >
        <Info size={12} />
      </TooltipTrigger>
      <TooltipContent side="top">{text}</TooltipContent>
    </Tooltip>
  );
}
