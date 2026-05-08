"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Kitchen Floor", description: "Agent status", icon: "\u{1F468}\u200D\u{1F373}" },
  { href: "/agents", label: "Hire Crew", description: "Agent registry", icon: "◎" },
  { href: "/ledger", label: "The Ledger", description: "RTK token tracking", icon: "\u{1F9FE}" },
  { href: "/notebooks", label: "Notebook Wall", description: "Memory graph", icon: "\u{1F9E0}" },
  { href: "/library", label: "The Library", description: "Knowledge files", icon: "\u{1F4DA}" },
  { href: "/cookbooks", label: "The Cookbooks", description: "Skill analytics", icon: "📚" },
  { href: "/flow", label: "The Flow", description: "System topology", icon: "\u{1F504}" },
  { href: "/dispatch", label: "The Dispatch", description: "A2A delegation", icon: "📡" },
  { href: "/apo", label: "The Sous Vide", description: "APO proposals", icon: "\u{1F372}" },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Close sidebar on route change on mobile
  useEffect(() => {
    if (onClose) onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const navContent = (showClose: boolean) => (
    <>
      <div className="mb-7 flex items-center justify-between border-b border-slate-200 px-2 pb-5">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Workspace</p>
          <h1 className="mt-1 truncate text-base font-semibold text-slate-950">agentkitche.dev</h1>
          <p className="text-xs text-slate-500">Agent fleet control</p>
        </div>
        {/* Close button — mobile only */}
        {showClose && onClose && (
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 lg:hidden"
            aria-label="Close menu"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        )}
      </div>
      <nav className="flex flex-1 flex-col gap-1.5">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-sm border border-transparent px-3 py-2.5 text-sm transition-all",
                isActive
                  ? "border-cyan-200 bg-cyan-50 text-slate-950 shadow-[0_18px_50px_rgba(8,145,178,0.10)]"
                  : "text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base",
                  isActive ? "bg-white text-cyan-600" : "bg-slate-100 text-slate-500 group-hover:bg-white"
                )}
              >
                {item.icon}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold leading-4">{item.label}</span>
                <span
                  className={cn(
                    "mt-0.5 block truncate text-[11px] font-medium leading-3",
                    isActive ? "text-slate-500" : "text-slate-400"
                  )}
                >
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 px-2 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Local-first</p>
        <p className="mt-1 text-xs text-slate-500">A2A hub / operator console</p>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 flex-col border-r border-slate-200 bg-[#f7f7f4] px-4 py-5 text-slate-950 lg:flex">
        {navContent(false)}
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="lg:hidden">
        {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

        {/* Slide-in drawer */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-slate-200 bg-[#f7f7f4] px-4 py-5 text-slate-950 shadow-2xl transition-transform duration-300 ease-in-out",
            isOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {navContent(true)}
        </aside>
        </div>
      )}
    </>
  );
}
