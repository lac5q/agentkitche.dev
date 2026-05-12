import Link from "next/link";
import {
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  CheckCircle2,
  Code2,
  Database,
  GitBranch,
  PackageSearch,
  RefreshCw,
  Send,
} from "lucide-react";
import { KangarooMark } from "@/components/layout/brand-mark";

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

const proofs = [
  "Context packs before agent dispatch",
  "Source-backed memory for product, sales, and engineering",
  "Skills promoted from repeated successful workflows",
  "Governance hooks for identity, permissions, and audit",
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

export default function LandingPage() {
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
              href="#proof"
              className="hidden rounded border border-transparent px-4 py-2 text-sm font-semibold text-[#4a4a45] transition hover:border-[#c9c9c2] hover:bg-white hover:text-[#0f0f0e] sm:inline-flex"
            >
              Proof points
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
          <div>
            <h1 className="max-w-[18ch] text-[clamp(44px,7vw,78px)] font-semibold leading-[1.04] tracking-normal text-[#0f0f0e]">
              Stop making every agent start from zero.
            </h1>
            <p className="mt-7 max-w-[62ch] text-[18px] leading-8 text-[#4a4a45]">
              MemroOS retains what product, sales, and engineering agents learn, retrieves the right context at runtime, and turns repeated work into durable skills.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="#workflows"
                className="inline-flex items-center gap-2 bg-[#a8392c] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#7a2a1e]"
              >
                Explore workflows
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                href="#proof"
                className="inline-flex items-center border border-[#0f0f0e] px-5 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#0f0f0e] transition hover:bg-[#0f0f0e] hover:text-white"
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

          <div className="border border-[#1f1f1c] bg-white p-5 shadow-[0_12px_32px_rgba(0,0,0,0.04)]">
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
                <div key={workflow.title} className="grid gap-4 py-5 md:grid-cols-[160px_1fr]">
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
