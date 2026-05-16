import type { NextRequest } from "next/server";

import {
  formatEvalConfigYaml,
  loadEvalConfig,
  saveEvalConfig,
  setActivePreset,
} from "@/lib/evals/config";
import { authorizeRegistryWrite, registryWriteUnauthorizedResponse } from "@/lib/operator-auth";
import { BUILT_IN_PRESETS } from "@/lib/evals/presets";
import type { EvalConfig } from "@/lib/evals/types";

export const dynamic = "force-dynamic";

export function GET() {
  const config = loadEvalConfig();
  return Response.json({
    config,
    yaml: formatEvalConfigYaml(config),
    timestamp: new Date().toISOString(),
  });
}

export async function PUT(req: NextRequest) {
  if (!authorizeRegistryWrite(req)) {
    return registryWriteUnauthorizedResponse();
  }

  const body = (await req.json().catch(() => null)) as { config?: EvalConfig } | null;
  if (!body?.config) {
    return Response.json({ error: "config is required" }, { status: 400 });
  }

  const config = saveEvalConfig(body.config);
  return Response.json({
    ok: true,
    config,
    yaml: formatEvalConfigYaml(config),
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/evals/config
 * Accepts { active_preset: string | null } to switch the active preset.
 * Validates the preset name against known presets before writing.
 */
export async function POST(req: NextRequest) {
  if (!authorizeRegistryWrite(req)) {
    return registryWriteUnauthorizedResponse();
  }

  const body = (await req.json().catch(() => null)) as { active_preset?: string | null } | null;
  if (!body || !("active_preset" in body)) {
    return Response.json({ error: "active_preset field is required" }, { status: 400 });
  }

  // Normalize: undefined is treated as null (clear preset)
  const presetName: string | null = body.active_preset ?? null;

  // Validate preset name if non-null
  if (presetName !== null) {
    const currentConfig = loadEvalConfig();
    const knownPresets = new Set([
      ...Object.keys(currentConfig.weightPresets ?? {}),
      ...Object.keys(BUILT_IN_PRESETS),
    ]);
    if (!knownPresets.has(presetName)) {
      return Response.json(
        { error: `Unknown preset: "${presetName}". Known presets: ${[...knownPresets].join(", ")}` },
        { status: 400 }
      );
    }
  }

  const config = setActivePreset(presetName);
  return Response.json({
    ok: true,
    config,
    yaml: formatEvalConfigYaml(config),
    timestamp: new Date().toISOString(),
  });
}
