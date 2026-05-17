import type { EvalConfig } from "@/lib/evals/types";

export interface FinanceTerminology {
  enabled: boolean;
  trace: string;
  eval: string;
  proposal: string;
}

export function resolveFinanceTerminology(config: EvalConfig): FinanceTerminology {
  if (!config.finance?.enabled) {
    return { enabled: false, trace: "trace", eval: "eval", proposal: "proposal" };
  }
  return {
    enabled: true,
    trace: config.finance.transactionLabel,
    eval: config.finance.reconciliationLabel,
    proposal: config.finance.exceptionLabel,
  };
}
