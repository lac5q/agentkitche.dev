import { DEFAULT_PERFORMANCE_BUDGETS, performanceBudgetStatus, responseCache } from "@/lib/response-cache";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    stats: responseCache.stats(),
    performance: performanceBudgetStatus(DEFAULT_PERFORMANCE_BUDGETS),
    timestamp: new Date().toISOString(),
  });
}
