import Link from "next/link";
import { headers } from "next/headers";
import {
  Archive,
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  Code2,
  Database,
  FileSearch,
  Gauge,
  GitBranch,
  KeyRound,
  MessageSquareText,
  PackageSearch,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wrench,
} from "lucide-react";
import { KangarooMark } from "@/components/layout/brand-mark";
import { OperatorHome } from "@/components/workspace/operator-home";

const PUBLIC_LANDING_HOSTS = new Set(["memroos.com", "www.memroos.com", "memroos.vercel.app"]);

function isPublicLandingHost(host: string): boolean {
  const normalized = host.split(":")[0]?.toLowerCase() ?? "";
  return PUBLIC_LANDING_HOSTS.has(normalized) || normalized.endsWith(".vercel.app");
}

const workflows = [
  {
    title: "Product",
    icon: PackageSearch,
    retained: "Customer interviews, launch learnings, objections, roadmap decisions",
    consumed: "PRDs, prioritization, release notes, beta follow-up",
  },
  {
    title: "Sales",
    icon: BriefcaseBusiness,
    retained: "CRM notes, call takeaways, buyer preferences, competitor mentions",
    consumed: "Account briefs, talk tracks, follow-up, expansion plans",
  },
  {
    title: "Engineering",
    icon: Code2,
    retained: "Architecture decisions, incidents, deploy fixes, repo patterns",
    consumed: "Debug plans, code reviews, migrations, onboarding, runbooks",
  },
];

const loop = [
  { label: "Capture", icon: Database, detail: "Events, docs, code, and conversations land in one governed memory layer." },
  { label: "Consolidate", icon: Brain, detail: "Raw activity becomes semantic, episodic, and procedural memory agents can reuse." },
  { label: "Retrieve", icon: GitBranch, detail: "Agents receive permission-aware context packs before each workflow begins." },
  { label: "Act", icon: Send, detail: "Delegated work ships with source-backed context instead of repeated discovery." },
  { label: "Improve", icon: RefreshCw, detail: "Outcomes update memory and promote repeatable work into durable skills." },
];

const proofPoints = [
  { value: "3", label: "first workflows", detail: "Product, sales, and engineering are the initial memory-critical surfaces." },
  { value: "5", label: "memory moves", detail: "Capture, consolidate, retrieve, act, and improve become one operating loop." },
  { value: "1", label: "context plane", detail: "One shared source of retained knowledge across agents, files, and decisions." },
];

const topValueFeatures = [
  {
    number: "01",
    title: "Memory that every agent can use",
    icon: Archive,
    detail: "MemroOS keeps decisions, customer context, files, conversations, outcomes, and prior work in one durable memory layer.",
    outcome: "No more re-explaining the business. Every agent starts with what the company already learned.",
  },
  {
    number: "02",
    title: "Runtime context packs before dispatch",
    icon: Send,
    detail: "MemroOS assembles the right memories, knowledge files, and skills before product, sales, or engineering work begins.",
    outcome: "Fewer back-and-forths. Better first responses from every agent.",
  },
  {
    number: "03",
    title: "One place to engage active agents",
    icon: MessageSquareText,
    detail: "Chat, voice, dispatch, standups, live delegations, and agent status sit in one operator surface.",
    outcome: "Small teams get a practical agent command center without enterprise ceremony.",
  },
  {
    number: "04",
    title: "Skills from repeated work",
    icon: Wrench,
    detail: "Successful repeated workflows become durable procedures, playbooks, and reusable skill signals.",
    outcome: "Institutional knowledge compounds instead of living in one-off chats.",
  },
  {
    number: "05",
    title: "Trust, evals, and speed built in",
    icon: ShieldCheck,
    detail: "Security checks, permissions, human approval, model routing, evaluation signals, and caching support safer agent work.",
    outcome: "Ship with confidence, audit what happened, and keep agent work fast.",
  },
];

const proofs = [
  "Context packs before agent dispatch",
  "Source-backed memory for product, sales, and engineering",
  "Skills promoted from repeated successful workflows",
  "Governance hooks for identity, permissions, and audit",
];

const featureGroups = [
  {
    title: "Memory",
    icon: Brain,
    items: [
      "Shared semantic, graph, and episodic memory",
      "Multi-memory search",
      "Memory timeline and retention signals",
      "Memory access controls",
      "Outcome capture after agent work",
    ],
  },
  {
    title: "Knowledge",
    icon: FileSearch,
    items: [
      "Knowledge file ingest and indexing",
      "Freshness and corpus health",
      "Source-backed retrieval",
      "Collections for teams and workflows",
      "Docs, notes, and repo context",
    ],
  },
  {
    title: "Agents",
    icon: UsersRound,
    items: [
      "Canonical agent registry",
      "Local, REST, UI, and A2A agents",
      "Agent cards and capabilities",
      "Dispatch and live delegations",
      "Engagement console for standups",
    ],
  },
  {
    title: "Trust",
    icon: KeyRound,
    items: [
      "Iris dispatch preflight",
      "Prompt-injection checks",
      "Tool permission governance",
      "Human-in-the-loop approvals",
      "Audit logs and security reports",
    ],
  },
  {
    title: "Optimization",
    icon: Sparkles,
    items: [
      "Model-routing telemetry",
      "LLM recommendation surfaces",
      "Evaluation fixtures",
      "Quality reports",
      "Skill extraction signals",
    ],
  },
  {
    title: "Runtime",
    icon: GitBranch,
    items: [
      "Runtime middleware",
      "Memory client v2 paths",
      "Agent observability",
      "Task lifecycle routes",
      "SSE task updates",
    ],
  },
  {
    title: "Performance",
    icon: Gauge,
    items: [
      "Response caching",
      "Query-path tuning",
      "Cache prewarm and purge APIs",
      "Usage analytics",
      "Faster memory retrieval",
    ],
  },
];

const completedRoadmap = [
  {
    phase: "Phase 41",
    label: "Public Polish",
    detail: "Public README, contribution guide, security policy, issue templates, license boundary, and GitHub Actions checks.",
  },
  {
    phase: "Phases 42-45",
    label: "v2.1 Security + Trust Layer",
    detail: "Iris dispatch preflight, prompt-injection checks, tool governance, security reporting, and capability controls.",
  },
  {
    phase: "Phases 46-49",
    label: "v2.2 LLM Optimization + Evaluation",
    detail: "Model-routing telemetry, recommendations, eval fixtures, optimization dashboards, and quality reports.",
  },
  {
    phase: "Phases 50-52",
    label: "v2.3 Agent Runtime Enhancements",
    detail: "Runtime middleware, memory client v2 paths, engagement state, and observability surfaces for live agents.",
  },
  {
    phase: "Phases 53-54",
    label: "v2.4 Performance + Caching",
    detail: "Response caching, query-path tuning, and faster memory and knowledge retrieval for operator workflows.",
  },
];

const testimonials = [
  {
    quote:
      "The shift is obvious: agents stop asking the same setup questions and start with the prior decision already in hand.",
    name: "Founding PM",
    role: "AI infrastructure startup",
  },
  {
    quote:
      "The useful part is not just retrieval. It is seeing what memory an agent consumed before it touched the workflow.",
    name: "Revenue operator",
    role: "B2B AI team",
  },
  {
    quote:
      "Engineering handoffs get sharper when incidents, fixes, and repo patterns become part of the next agent's starting state.",
    name: "Staff engineer",
    role: "Native AI product company",
  },
];

function LandingPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#fafaf7] text-[#1f1f1c]">
      <section className="relative isolate border-b border-[#c9c9c2] bg-[linear-gradient(180deg,#fafaf7_0%,#f2f2ee_100%)]">
        <div className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="MemroOS home">
            <KangarooMark className="h-11 w-11 border border-[#c9c9c2] text-[#fafaf7]" />
            <div>
              <p className="text-lg font-semibold tracking-normal text-[#0f0f0e]">MemroOS</p>
              <p className="text-xs font-medium text-[#4a4a45]">Memory OS for agent workflows</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="#memory-first"
              className="hidden rounded border border-transparent px-4 py-2 text-sm font-semibold text-[#4a4a45] transition hover:border-[#c9c9c2] hover:bg-white hover:text-[#0f0f0e] sm:inline-flex"
            >
              Memory
            </Link>
            <Link
              href="#features"
              className="hidden rounded border border-transparent px-4 py-2 text-sm font-semibold text-[#4a4a45] transition hover:border-[#c9c9c2] hover:bg-white hover:text-[#0f0f0e] md:inline-flex"
            >
              Features
            </Link>
            <Link
              href="#memory-loop"
              className="inline-flex items-center gap-2 bg-[#0f0f0e] px-4 py-2 text-sm font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#a8392c]"
            >
              See the loop
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <div className="mx-auto grid max-w-[1180px] gap-12 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end lg:pb-20">
          <div className="mk-reveal">
            <h1 className="max-w-[18ch] text-[clamp(44px,7vw,78px)] font-semibold leading-[1.04] tracking-normal text-[#0f0f0e]">
              Stop making every agent start from zero.
            </h1>
            <p className="mt-7 max-w-[62ch] text-[18px] leading-8 text-[#4a4a45]">
              MemroOS is the shared memory layer for product, sales, and engineering agents: retain what the company learns, retrieve the right context at runtime, and turn repeated work into durable skills.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="#memory-first"
                className="inline-flex items-center gap-2 bg-[#a8392c] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#7a2a1e]"
              >
                Explore memory layer
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="#demo"
                className="inline-flex items-center border border-[#0f0f0e] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0f0f0e] transition hover:bg-[#0f0f0e] hover:text-white"
              >
                Watch demo
              </Link>
              <Link
                href="#proof"
                className="inline-flex items-center border border-[#c9c9c2] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0f0f0e] transition hover:border-[#0f0f0e]"
              >
                View proof
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap items-center gap-6 text-[12px] uppercase tracking-[0.1em] text-[#4a4a45]">
              <span className="font-semibold text-[#0f0f0e]">Agentic knowledge retention</span>
              <span className="border-l border-[#c9c9c2] pl-6">Runtime context packs</span>
              <span className="border-l border-[#c9c9c2] pl-6">Skills from repeated work</span>
            </div>
          </div>

          <div className="mk-context-panel mk-reveal mk-reveal-delay-1 border border-[#1f1f1c] bg-white p-5 shadow-[0_12px_32px_rgba(0,0,0,0.04)]">
            <div className="flex items-center justify-between border-b border-[#e4e4dd] pb-4">
              <div className="flex items-center gap-3">
                <KangarooMark className="h-12 w-12 border border-[#c9c9c2]" />
                <div>
                  <p className="text-[15px] font-semibold text-[#0f0f0e]">Runtime Context Pack</p>
                  <p className="text-[13px] text-[#4a4a45]">Generated before agent dispatch</p>
                </div>
              </div>
              <span className="border border-[#f2e2dc] bg-[#f2e2dc] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#7a2a1e]">
                ready
              </span>
            </div>

            <div className="grid gap-px bg-[#c9c9c2] md:grid-cols-3">
              {["97 memories", "5,854 files", "96 skills"].map((metric) => (
                <div key={metric} className="bg-[#fafaf7] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#4a4a45]">linked</p>
                  <p className="mt-2 text-[22px] font-semibold text-[#0f0f0e]">{metric}</p>
                </div>
              ))}
            </div>

            <div className="divide-y divide-[#e4e4dd] border-y border-[#e4e4dd]">
              {workflows.map((workflow) => (
                <div key={workflow.title} className="mk-context-row grid gap-4 py-5 md:grid-cols-[160px_1fr]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#f2e2dc] text-[#a8392c]">
                      <workflow.icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <p className="font-semibold text-[#0f0f0e]">{workflow.title}</p>
                  </div>
                  <p className="text-[15px] leading-6 text-[#4a4a45]">{workflow.consumed}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="memory-first" className="border-y border-[#1f1f1c] bg-[#0f0f0e] text-white">
        <div className="mx-auto grid max-w-[1180px] gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:py-20">
          <div className="mk-reveal">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#e7b6a8]">Memory is feature one</p>
            <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-white">
              The product is not another chat box. It is company memory agents can consume.
            </h2>
            <p className="mt-5 text-[17px] leading-8 text-[#d8d4cb]">
              For AI-native small businesses, the advantage is not having more agents. It is making every agent start with the same retained context: customer history, product decisions, sales notes, repo patterns, incidents, tasks, and outcomes.
            </p>
          </div>
          <div className="grid gap-px bg-[#4a4a45] md:grid-cols-3">
            {[
              ["Retain", "Capture what happened across files, chats, calls, commits, and agent outcomes."],
              ["Retrieve", "Pull the right memories into a context pack before the agent begins."],
              ["Reinforce", "Feed completed work back into memory so the next workflow starts smarter."],
            ].map(([title, detail]) => (
              <article key={title} className="bg-[#171715] p-6">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#e7b6a8]">{title}</p>
                <p className="mt-4 text-[20px] leading-8 text-white">{detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="value" className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <div className="mk-reveal">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">Top 5 value features</p>
            <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
              Memory first, then context, engagement, skills, and trust.
            </h2>
            <p className="mt-4 text-[17px] leading-8 text-[#4a4a45]">
              Native AI small businesses need agents that remember the company before they act. Everything else in MemroOS supports that memory loop.
            </p>
          </div>
          <div className="divide-y divide-[#c9c9c2] border-y border-[#c9c9c2]">
            {topValueFeatures.map((feature, index) => (
              <article
                key={feature.title}
                className="mk-feature-row grid gap-5 py-6 md:grid-cols-[80px_220px_1fr]"
                style={{ animationDelay: `${index * 90}ms` }}
              >
                <div className="flex items-start justify-between gap-3 md:block">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">{feature.number}</p>
                  <span className="mt-3 flex h-11 w-11 items-center justify-center border border-[#c9c9c2] bg-white text-[#a8392c]">
                    <feature.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <h3 className="text-[24px] font-semibold leading-snug text-[#0f0f0e]">{feature.title}</h3>
                <div>
                  <p className="text-[15px] leading-7 text-[#4a4a45]">{feature.detail}</p>
                  <p className="mt-3 border-l-2 border-[#a8392c] pl-4 text-[15px] font-semibold leading-7 text-[#0f0f0e]">
                    {feature.outcome}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">Proof points</p>
            <h2 className="mt-3 max-w-[18ch] text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
              Built around the first places AI teams lose context.
            </h2>
          </div>
          <div className="grid gap-px bg-[#c9c9c2] md:grid-cols-3">
            {proofPoints.map((point) => (
              <article key={point.label} className="bg-[#fafaf7] p-6">
                <p className="text-[52px] font-semibold leading-none text-[#a8392c]">{point.value}</p>
                <h3 className="mt-5 text-[18px] font-semibold text-[#0f0f0e]">{point.label}</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#4a4a45]">{point.detail}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="mt-10 grid gap-3 md:grid-cols-2">
          {proofs.map((proof) => (
            <div key={proof} className="flex items-start gap-3 border-l-2 border-[#a8392c] bg-white px-4 py-3 text-[15px] leading-6 text-[#4a4a45]">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#a8392c]" aria-hidden="true" />
              {proof}
            </div>
          ))}
        </div>
      </section>

      <section id="demo" className="border-y border-[#c9c9c2] bg-white">
        <div className="mx-auto grid max-w-[1180px] gap-8 px-5 py-16 sm:px-8 lg:grid-cols-[0.75fr_1.25fr] lg:items-center lg:py-20">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">Video demo</p>
            <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
              See the memory loop in motion.
            </h2>
            <p className="mt-4 text-[17px] leading-8 text-[#4a4a45]">
              A 64-second animated product demo with voiceover, logo intro, QR links, and a custom electronic score, starting with memory as the core value prop and moving through context packs, teams, skills, trust, and runtime.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/demo/memroos-demo.mp4"
                className="inline-flex items-center gap-2 bg-[#0f0f0e] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#a8392c]"
              >
                Open video
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="https://github.com/lac5q/memroos"
                className="inline-flex items-center border border-[#0f0f0e] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0f0f0e] transition hover:bg-[#0f0f0e] hover:text-white"
              >
                GitHub repo
              </Link>
            </div>
          </div>
          <div className="border border-[#1f1f1c] bg-[#0f0f0e] p-3 shadow-[0_12px_32px_rgba(0,0,0,0.08)]">
            <video
              className="aspect-video w-full bg-black"
              controls
              playsInline
              poster="/demo/memroos-demo-poster.jpg"
              preload="metadata"
            >
              <source src="/demo/memroos-demo.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      </section>

      <section id="memory-loop" className="border-y border-[#c9c9c2] bg-white">
        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
          <div className="max-w-[760px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">Memory loop</p>
            <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
              Retention and consumption designed as one loop.
            </h2>
            <p className="mt-4 text-[17px] leading-8 text-[#4a4a45]">
              Most agent systems remember too little, too late. MemroOS makes memory visible before the handoff, then updates it after the work finishes.
            </p>
          </div>
          <div className="mt-8 grid gap-px bg-[#c9c9c2] md:grid-cols-5">
            {loop.map((step, index) => (
              <article key={step.label} className="bg-[#fafaf7] p-5">
                <div className="flex items-center justify-between">
                  <span className="flex h-9 w-9 items-center justify-center bg-white text-[#a8392c]">
                    <step.icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="text-[12px] font-semibold text-[#4a4a45]">{String(index + 1).padStart(2, "0")}</span>
                </div>
                <h3 className="mt-5 text-[17px] font-semibold text-[#0f0f0e]">{step.label}</h3>
                <p className="mt-3 text-[14px] leading-6 text-[#4a4a45]">{step.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflows" className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">Initial use cases</p>
            <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
              Start where context loss hurts first.
            </h2>
            <p className="mt-4 text-[17px] leading-8 text-[#4a4a45]">
              Product, sales, and engineering already produce the evidence agents need, but that evidence is scattered across docs, calls, commits, chats, and tools.
            </p>
          </div>
          <div className="divide-y divide-[#c9c9c2] border-y border-[#c9c9c2]">
            {workflows.map((workflow) => (
              <article key={workflow.title} className="grid gap-5 py-7 md:grid-cols-[180px_1fr]">
                <div>
                  <workflow.icon className="h-5 w-5 text-[#a8392c]" aria-hidden="true" />
                  <h3 className="mt-4 text-[24px] font-semibold text-[#0f0f0e]">{workflow.title}</h3>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#4a4a45]">Retains</p>
                    <p className="mt-2 text-[15px] leading-7 text-[#4a4a45]">{workflow.retained}</p>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#4a4a45]">Consumed as</p>
                    <p className="mt-2 text-[15px] leading-7 text-[#4a4a45]">{workflow.consumed}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-[#c9c9c2] bg-white">
        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr]">
            <div className="mk-reveal">
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">Full feature map</p>
              <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
                Memory is the durable layer beneath every agent workflow.
              </h2>
              <p className="mt-4 text-[17px] leading-8 text-[#4a4a45]">
                The product surface is intentionally broad, but it starts with memory: retained context, source-backed retrieval, runtime consumption, governance, evaluation, and speed working together.
              </p>
            </div>
            <div className="grid gap-px bg-[#c9c9c2] md:grid-cols-2">
              {featureGroups.map((group) => (
                <article key={group.title} className="mk-feature-card bg-[#fafaf7] p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center bg-white text-[#a8392c]">
                      <group.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="text-[21px] font-semibold text-[#0f0f0e]">{group.title}</h3>
                  </div>
                  <ul className="mt-5 space-y-3">
                    {group.items.map((item) => (
                      <li key={item} className="flex gap-3 text-[14px] leading-6 text-[#4a4a45]">
                        <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#a8392c]" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="roadmap" className="border-y border-[#c9c9c2] bg-[#f2f2ee]">
        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
          <div className="max-w-[760px]">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">Completed roadmap</p>
            <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
              Public polish, trust, evals, runtime, and speed are already in the loop.
            </h2>
            <p className="mt-4 text-[17px] leading-8 text-[#4a4a45]">
              The public preview includes the production-readiness phases that make memory useful for real agent workflows, not just demos.
            </p>
          </div>
          <div className="mt-9 divide-y divide-[#c9c9c2] border-y border-[#c9c9c2]">
            {completedRoadmap.map((item) => (
              <article key={item.phase} className="grid gap-4 py-6 md:grid-cols-[180px_260px_1fr]">
                <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">{item.phase}</p>
                <h3 className="text-[20px] font-semibold text-[#0f0f0e]">{item.label}</h3>
                <p className="text-[15px] leading-7 text-[#4a4a45]">{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-[#c9c9c2] bg-[#f2f2ee]">
        <div className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
          <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[#7a2a1e]">What teams notice</p>
              <h2 className="mt-3 text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
                The memory layer changes the handoff.
              </h2>
            </div>
          </div>
          <div className="grid gap-px bg-[#c9c9c2] md:grid-cols-3">
            {testimonials.map((testimonial) => (
              <figure key={testimonial.name} className="bg-[#fafaf7] p-6">
                <blockquote className="text-[20px] leading-8 text-[#0f0f0e]">
                  &quot;{testimonial.quote}&quot;
                </blockquote>
                <figcaption className="mt-6 border-t border-[#e4e4dd] pt-4">
                  <p className="font-semibold text-[#0f0f0e]">{testimonial.name}</p>
                  <p className="text-[14px] text-[#4a4a45]">{testimonial.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1180px] px-5 py-16 sm:px-8 lg:py-20">
        <div className="border-y border-[#0f0f0e] py-10">
          <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex items-center gap-4">
              <KangarooMark className="h-12 w-12 border border-[#c9c9c2]" />
              <h2 className="max-w-[20ch] text-[42px] font-semibold leading-tight tracking-normal text-[#0f0f0e]">
                Give every agent the team&apos;s lived context before it starts.
              </h2>
            </div>
            <Link
              href="#memory-loop"
              className="inline-flex items-center justify-center gap-2 bg-[#0f0f0e] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#a8392c]"
            >
              See memory loop
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

export default async function HomePage() {
  const host = (await headers()).get("host") ?? "";
  return isPublicLandingHost(host) ? <LandingPage /> : <OperatorHome />;
}
