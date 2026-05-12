import { getDb } from "@/lib/db";
import { summarizeModelRouting } from "@/lib/model-routing";

export const dynamic = "force-dynamic";

const dimensions = [
  {
    id: "task_fit",
    label: "Task fit",
    rubric: "Recommended model matches product, sales, engineering, or support task constraints.",
  },
  {
    id: "knowledge_use",
    label: "Knowledge use",
    rubric: "Agent retrieves relevant retained context before execution and cites memory source tiers.",
  },
  {
    id: "cost_latency",
    label: "Cost and latency",
    rubric: "Routing decision respects the selected cost, quality, latency, or balanced strategy.",
  },
  {
    id: "outcome_quality",
    label: "Outcome quality",
    rubric: "Human or automated score confirms the selected model produced usable work.",
  },
];

const referenceTasks = [
  { id: "product-prd", taskType: "product", strategy: "quality" },
  { id: "sales-account-brief", taskType: "sales", strategy: "balanced" },
  { id: "engineering-fix", taskType: "engineering", strategy: "latency" },
];

export function GET() {
  return Response.json({
    dimensions,
    referenceTasks,
    summary: summarizeModelRouting(getDb()),
    timestamp: new Date().toISOString(),
  });
}
