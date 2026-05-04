import type { NextRequest } from "next/server";
import { getSimilarTaskRecommendations } from "@/lib/tool-attention";
import type { ToolAttentionContextPack } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const context: ToolAttentionContextPack = {
    task_type: params.get("task_type") ?? undefined,
    repo: params.get("repo") ?? undefined,
    agent_id: params.get("agent_id") ?? undefined,
    tags: params.get("tags") ? params.get("tags")!.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
  };
  const limit = Number(params.get("limit") ?? "10");
  return Response.json(
    getSimilarTaskRecommendations(context, Number.isFinite(limit) ? limit : 10)
  );
}
