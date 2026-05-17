"use client";

import { HealthDot } from "./health-dot";
import { KangarooMark } from "./brand-mark";
import type { HealthStatus } from "@/types";

interface TopBarProps {
  services: HealthStatus[];
  onMenuClick?: () => void;
}

export function TopBar({ services, onMenuClick }: TopBarProps) {
  return (
    <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[#c9c9c2] bg-[#fafaf7]/92 px-4 text-[#0f0f0e] backdrop-blur-md lg:left-72 lg:px-6">
      <div className="flex shrink-0 items-center gap-3">
        {/* Hamburger — mobile only */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="flex h-8 w-8 items-center justify-center rounded text-[#4a4a45] transition-colors hover:bg-[#f2e2dc] hover:text-[#7a2a1e] lg:hidden"
            aria-label="Open menu"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="2" y="4" width="16" height="2" rx="1" />
              <rect x="2" y="9" width="16" height="2" rx="1" />
              <rect x="2" y="14" width="16" height="2" rx="1" />
            </svg>
          </button>
        )}
        <KangarooMark className="h-8 w-8 lg:hidden" />
        <h2 className="text-sm font-semibold text-[#0f0f0e]">Runtime Health</h2>
      </div>
      <div className="hidden min-w-0 items-center gap-3 overflow-x-auto pl-1 sm:flex sm:gap-4">
        {services.map((svc) => (
          <HealthDot
            key={svc.service}
            service={svc.service}
            status={svc.status}
            latencyMs={svc.latencyMs}
            detail={svc.detail}
          />
        ))}
      </div>
    </header>
  );
}
