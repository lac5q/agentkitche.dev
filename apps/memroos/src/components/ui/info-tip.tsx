"use client";

import { Info } from "lucide-react";

export function InfoTip({ text }: { text: string }) {
  return (
    <span className="group relative ml-1.5 inline-flex">
      <span
        aria-label="More information"
        className="inline-flex items-center text-slate-600 transition-colors hover:text-slate-400"
        role="img"
      >
        <Info size={12} />
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 hidden w-64 -translate-x-1/2 rounded-md bg-slate-100 px-3 py-1.5 text-xs leading-snug text-slate-950 shadow-lg group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}
