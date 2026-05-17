import Link from "next/link";

interface MemroosFallbackProps {
  eyebrow: string;
  title: string;
  message: string;
  code?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function MemroosFallback({
  eyebrow,
  title,
  message,
  code,
  primaryHref = "/flow",
  primaryLabel = "Open Workflow Map",
  secondaryHref = "/",
  secondaryLabel = "Overview",
}: MemroosFallbackProps) {
  return (
    <section className="relative isolate min-h-[calc(100vh-7rem)] overflow-hidden rounded-3xl border border-slate-800 bg-[#050914] px-6 py-10 shadow-2xl shadow-black/30 sm:px-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(245,158,11,0.20),transparent_26%),radial-gradient(circle_at_78%_18%,rgba(14,165,233,0.15),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.95),rgba(2,6,23,1))]" />
      <div className="absolute inset-0 -z-10 opacity-30 [background-image:linear-gradient(rgba(148,163,184,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.09)_1px,transparent_1px)] [background-size:32px_32px]" />

      <div className="mx-auto flex max-w-5xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.9)]" />
            {eyebrow}
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-50 sm:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
            {message}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={primaryHref}
              className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
            >
              {primaryLabel}
            </Link>
            <Link
              href={secondaryHref}
              className="rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              {secondaryLabel}
            </Link>
          </div>
        </div>

        <div className="w-full max-w-sm rounded-3xl border border-slate-700/80 bg-slate-950/80 p-5 shadow-2xl shadow-black/40">
          <div className="mb-4 flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
              Route Trace
            </span>
            <span className="rounded-full bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-300">
              {code ?? "offline?"}
            </span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-200">
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              Request entered the workspace
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-sky-500/30 bg-sky-500/10 p-3 text-sky-200">
              <span className="h-3 w-3 rounded-full bg-sky-400" />
              Registry checked for a matching route
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-rose-200">
              <span className="h-3 w-3 rounded-full bg-rose-400" />
              No safe route was found
            </div>
          </div>
          <p className="mt-5 text-xs leading-5 text-slate-500">
            If the server itself is stopped, the browser cannot receive this screen. Start the workspace again on port 3002, then refresh.
          </p>
        </div>
      </div>
    </section>
  );
}
