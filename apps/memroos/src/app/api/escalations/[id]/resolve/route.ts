import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { authenticateUser } from "@/lib/auth/session";
import { requireRole } from "@/lib/auth/middleware-roles";
import { resolveEscalation } from "@/lib/audit/write";
import type { HilEscalation } from "@/lib/audit/schema";

export const dynamic = "force-dynamic";

/**
 * POST /api/escalations/:id/resolve
 *
 * Resolves an open HIL escalation. Operator and admin only (reviewer gets 403).
 *
 * Body: { note?: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await authenticateUser(req);
  const roleError = requireRole(session?.role, "operator");
  if (roleError) return roleError;
  if (!session) return Response.json({ error: "authentication required" }, { status: 401 });

  const { id } = await params;
  if (!id) {
    return Response.json({ error: "escalation id is required" }, { status: 400 });
  }

  let note: string | undefined;
  try {
    const body = await req.json() as { note?: string };
    note = body.note;
  } catch {
    // Body is optional — empty body is acceptable
  }

  const db = getDb();

  // Verify escalation exists before attempting resolution
  type EscalationRow = HilEscalation;
  const escalation = db
    .prepare("SELECT * FROM hil_escalations WHERE id = ?")
    .get(id) as EscalationRow | undefined;

  if (!escalation) {
    return Response.json({ error: "escalation not found" }, { status: 404 });
  }

  try {
    resolveEscalation(
      id,
      { actorId: session.userId, actorRole: session.role as "admin" | "operator", note },
      db
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "resolution failed";
    return Response.json({ error: message }, { status: 409 });
  }

  const updated = db
    .prepare("SELECT * FROM hil_escalations WHERE id = ?")
    .get(id) as EscalationRow;

  return Response.json({ escalation: updated, timestamp: new Date().toISOString() });
}
