"use client";

import { EvalEnginePanel } from "@/components/evals/eval-engine-panel";

export default function EvalsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-amber-500">Evals</h1>
        <p className="mt-1 text-sm text-slate-400">
          Eval engine config, drift guard status, and run history
        </p>
      </div>

      <EvalEnginePanel />
    </div>
  );
}
