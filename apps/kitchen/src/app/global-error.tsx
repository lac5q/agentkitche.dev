"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100">
        <main className="flex min-h-screen items-center justify-center p-6">
          <section className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-8 shadow-2xl shadow-black/40">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_18%,rgba(245,158,11,0.18),transparent_28%),radial-gradient(circle_at_78%_20%,rgba(14,165,233,0.14),transparent_28%)]" />
            <div className="mb-4 inline-flex rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.22em] text-rose-300">
              Critical kitchen fault
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-50">
              agentkitche.dev could not finish loading.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              The root app shell failed before the normal dashboard could render. If the server is stopped, restart Kitchen on port 3002; otherwise try reloading the route.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                onClick={reset}
                className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-400"
              >
                Retry loading Kitchen
              </button>
              <a
                href="/flow"
                className="rounded-xl border border-slate-700 bg-slate-900/70 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
              >
                Open Flow
              </a>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
