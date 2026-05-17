import type { NextRequest } from "next/server";

import { authenticateUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/middleware-roles";
import { AUDIT_EVENT_TYPES, ENTITY_TYPES } from "@/lib/audit/event-types";
import { writeAuditEntry } from "@/lib/audit/write";
import { loadEvalConfig, saveEvalConfig } from "@/lib/evals/config";
import { summarizeCompliancePosture } from "@/lib/compliance/data-residency";

export const dynamic = "force-dynamic";

interface ComplianceUpdateBody {
  dataResidencyEnabled?: boolean;
  auditRetentionDays?: number;
  enabledAdapters?: string[];
  judgeLocalEndpoint?: string;
  judgeProvider?: string;
  judgeModelFamily?: string;
}

async function requireAdmin(req: NextRequest | Request) {
  const session = await authenticateUser(req);
  if (!session) {
    return {
      session: null,
      response: Response.json({ error: "authentication required" }, { status: 401 }),
    };
  }
  const roleError = requireRole(session.role, "admin");
  if (roleError) return { session, response: roleError };
  return { session, response: null };
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.response) return auth.response;

  const config = loadEvalConfig();
  return Response.json({
    compliance: summarizeCompliancePosture(config),
    timestamp: new Date().toISOString(),
  });
}

export async function PUT(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth.response) return auth.response;
  const session = auth.session!;

  const body = (await req.json().catch(() => null)) as ComplianceUpdateBody | null;
  if (!body) {
    return Response.json({ error: "JSON body required" }, { status: 400 });
  }

  const config = loadEvalConfig();
  const updated = {
    ...config,
    judgeModel: {
      ...config.judgeModel,
      provider: body.judgeProvider ?? config.judgeModel.provider,
      modelFamily: body.judgeModelFamily ?? config.judgeModel.modelFamily,
      localEndpoint: body.judgeLocalEndpoint ?? config.judgeModel.localEndpoint,
    },
    compliance: {
      ...config.compliance,
      dataResidency: {
        ...config.compliance.dataResidency,
        enabled: body.dataResidencyEnabled ?? config.compliance.dataResidency.enabled,
      },
      auditRetentionDays:
        typeof body.auditRetentionDays === "number" && body.auditRetentionDays > 0
          ? Math.round(body.auditRetentionDays)
          : config.compliance.auditRetentionDays,
      enabledAdapters: Array.isArray(body.enabledAdapters)
        ? body.enabledAdapters.filter((adapter) => typeof adapter === "string" && adapter.length > 0)
        : config.compliance.enabledAdapters,
    },
  };

  saveEvalConfig(updated);
  const compliance = summarizeCompliancePosture(updated);

  writeAuditEntry({
    tenant_id: session.tenantId,
    actor_id: session.userId,
    actor_role: session.role,
    event_type: AUDIT_EVENT_TYPES.ADMIN_COMPLIANCE_UPDATED,
    entity_type: ENTITY_TYPES.COMPLIANCE_CONTROL,
    entity_id: "compliance:runtime",
    reason: "Admin updated compliance posture controls",
    metadata_json: { ...compliance },
  });

  return Response.json({
    ok: true,
    compliance,
    timestamp: new Date().toISOString(),
  });
}
