"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Brain,
  ClipboardCheck,
  ClipboardList,
  Database,
  GitBranch,
  Key,
  LayoutDashboard,
  Layers,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wrench,
} from "lucide-react";
import { UserMenu } from "./user-menu";
import { cn } from "@/lib/utils";
import { KangarooMark } from "./brand-mark";

const NAV_ITEMS = [
  { href: "/", label: "Home", description: "MemroOS landing", icon: LayoutDashboard },
  { href: "/notebooks", label: "Memory", description: "Retained context", icon: Brain },
  { href: "/library", label: "Knowledge", description: "Source corpus", icon: Database },
  { href: "/cookbooks", label: "Skills", description: "Procedural playbooks", icon: Wrench },
  { href: "/agents", label: "Agents", description: "Runtime registry", icon: Bot },
  { href: "/flow", label: "Workflow Map", description: "System topology", icon: GitBranch },
  { href: "/dispatch", label: "Engage", description: "Chat, voice, standups", icon: Send },
  { href: "/apo", label: "Improvements", description: "Optimization queue", icon: Sparkles },
  { href: "/ledger", label: "Usage", description: "Cost and model mix", icon: BarChart3 },
  { href: "/evals", label: "Evals", description: "Eval engine and drift guard", icon: ClipboardCheck },
  { href: "/business-ops", label: "Business Ops", description: "L3 outcome signals", icon: TrendingUp },
  { href: "/seal", label: "SEAL", description: "Self-improvement substrate", icon: RefreshCw },
  { href: "/audit", label: "Audit Log", description: "Immutable decision history", icon: ClipboardList },
  { href: "/escalations", label: "Escalations", description: "HIL queue with SLA", icon: AlertTriangle },
  { href: "/agent-autogen", label: "Agent Autogen", description: "Agent autogen proposals", icon: Bot },
  { href: "/memory-autogen", label: "Memory Autogen", description: "Memory proposals & policy lab", icon: Layers },
  { href: "/library#governance", label: "Governance", description: "Health and audit", icon: ShieldCheck },
  { href: "/team", label: "Team", description: "Users and invitations", icon: Users },
  { href: "/settings/api-keys", label: "API Keys", description: "Per-user API keys", icon: Key },
  { href: "/settings/compliance", label: "Compliance", description: "Self-hosted controls", icon: ShieldCheck },
];

function scrollToHashTarget(hash: string, attempt = 0) {
  const targetId = decodeURIComponent(hash.replace(/^#/, ""));
  if (!targetId) return;

  const target = document.getElementById(targetId);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  if (attempt < 5) {
    window.setTimeout(() => scrollToHashTarget(hash, attempt + 1), 50);
  }
}

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [currentHash, setCurrentHash] = useState(() =>
    typeof window === "undefined" ? "" : window.location.hash
  );

  // Close sidebar on route change on mobile
  useEffect(() => {
    const nextHash = window.location.hash;
    window.setTimeout(() => {
      setCurrentHash(nextHash);
      if (nextHash) scrollToHashTarget(nextHash);
    }, 0);
    if (onClose) onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    const syncHash = () => setCurrentHash(window.location.hash);
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

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

  const handleNavClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    const [targetPath, rawHash] = href.split("#");
    if (!rawHash || pathname !== targetPath) return;

    const hash = `#${rawHash}`;
    event.preventDefault();
    window.history.pushState(null, "", `${targetPath}${hash}`);
    setCurrentHash(hash);
    scrollToHashTarget(hash);
    onClose?.();
  };

  const navContent = (showClose: boolean) => (
    <>
      <div className="mb-7 flex items-center justify-between border-b border-[#c9c9c2] px-2 pb-5">
        <div className="flex min-w-0 items-center gap-3">
          <KangarooMark className="h-10 w-10 shrink-0" />
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7a2a1e]">MemroOS</p>
            <h1 className="mt-1 truncate text-base font-semibold text-[#0f0f0e]">MemroOS</h1>
            <p className="text-xs text-[#4a4a45]">Memory OS for agent workflows</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        {showClose && onClose && (
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#c9c9c2] text-[#4a4a45] transition-colors hover:bg-[#f2e2dc] hover:text-[#7a2a1e] lg:hidden"
            aria-label="Close menu"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        )}
      </div>
      <nav className="flex flex-1 flex-col gap-1.5">
        {NAV_ITEMS.map((item) => {
          const [targetPath, rawHash] = item.href.split("#");
          const isActive = rawHash
            ? pathname === targetPath && currentHash === `#${rawHash}`
            : pathname === item.href && !(item.href === "/library" && currentHash);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(event) => handleNavClick(event, item.href)}
              className={cn(
                "group flex items-center gap-3 rounded-sm border border-transparent px-3 py-2.5 text-sm transition-all",
                isActive
                  ? "border-[#a8392c] bg-[#f2e2dc] text-[#0f0f0e] shadow-[0_12px_32px_rgba(168,57,44,0.10)]"
                  : "text-[#4a4a45] hover:border-[#c9c9c2] hover:bg-white/70 hover:text-[#0f0f0e]"
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-base",
                  isActive ? "bg-white text-[#a8392c]" : "bg-[#e4e4dd] text-[#4a4a45] group-hover:bg-white"
                )}
              >
                <item.icon className="h-3.5 w-3.5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold leading-4">{item.label}</span>
                <span
                  className={cn(
                    "mt-0.5 block truncate text-[11px] font-medium leading-3",
                    isActive ? "text-[#4a4a45]" : "text-[#73736b]"
                  )}
                >
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-[#c9c9c2] px-2 pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a2a1e]">Operating model</p>
        <p className="mt-1 text-xs text-[#4a4a45]">Retain, retrieve, dispatch, improve</p>
      </div>
      <div className="border-t border-[#c9c9c2] mt-4 pt-2">
        <UserMenu />
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="fixed left-0 top-0 z-40 hidden h-screen w-72 flex-col border-r border-[#c9c9c2] bg-[#f2f2ee] px-4 py-5 text-[#1f1f1c] lg:flex">
        {navContent(false)}
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="lg:hidden">
        {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-[#0f0f0e]/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

        {/* Slide-in drawer */}
        <aside
          className={cn(
            "fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-[#c9c9c2] bg-[#f2f2ee] px-4 py-5 text-[#1f1f1c] shadow-2xl transition-transform duration-300 ease-in-out",
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
