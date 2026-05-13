import type { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { cacheKey, responseCache } from "@/lib/response-cache";

export const dynamic = "force-dynamic";

type SecurityStatus = "clear" | "watch" | "attention";

interface AuditRow {
  id: number;
  actor: string;
  action: string;
  target: string;
  detail: string | null;
  severity: "info" | "medium" | "high";
  timestamp: string;
}

const SECURITY_TERMS = [
  "agent-shield",
  "blocked",
  "capability",
  "denied",
  "iris",
  "policy",
  "secret",
  "security",
];

function clampLimit(raw: string | null): number {
  const parsed = raw !== null ? Number(raw) : 20;
  return Math.min(100, Math.max(1, Number.isNaN(parsed) ? 20 : parsed));
}

function isSecurityEvent(row: AuditRow): boolean {
  const haystack = `${row.action} ${row.target} ${row.detail ?? ""}`.toLowerCase();
  return SECURITY_TERMS.some((term) => haystack.includes(term));
}

function isBlockedEvent(row: AuditRow): boolean {
  const haystack = `${row.action} ${row.target} ${row.detail ?? ""}`.toLowerCase();
  return ["blocked", "denied", "rejected", "policy_denied"].some((term) => haystack.includes(term));
}

function redactDetail(detail: string | null): string | null {
  if (!detail) return null;
  return detail
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\bsk-[A-Za-z0-9_-]+\b/g, "[redacted]")
    .replace(/\bak_[A-Za-z0-9_-]+\b/g, "[redacted]")
    .replace(/("?(?:api[_-]?key|token|secret)"?\s*[:=]\s*)"[^"]+"/gi, "$1\"[redacted]\"");
}

function statusFor(rows: AuditRow[]): SecurityStatus {
  if (rows.some((row) => row.severity === "high")) return "attention";
  if (rows.some((row) => row.severity === "medium" || isBlockedEvent(row))) return "watch";
  return "clear";
}

function topActors(rows: AuditRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.actor, (counts.get(row.actor) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([actor, count]) => ({ actor, count }))
    .sort((a, b) => b.count - a.count || a.actor.localeCompare(b.actor))
    .slice(0, 5);
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl ?? new URL(req.url);
  const limit = clampLimit(url.searchParams.get("limit"));
  const db = getDb();
  const version = db
    .prepare(
      `SELECT
         COUNT(*) as count,
         MAX(id) as maxId,
         MAX(timestamp) as lastTimestamp,
         (
           SELECT group_concat(id || ':' || timestamp || ':' || action || ':' || target || ':' || severity, '|')
           FROM (
             SELECT id, timestamp, action, target, severity
             FROM audit_log
             ORDER BY id DESC
             LIMIT 20
           )
         ) as fingerprint
       FROM audit_log`
    )
    .get() as { count: number; maxId: number | null; lastTimestamp: string | null; fingerprint: string | null };
  return Response.json(
    await responseCache.getOrSet(
      "security-report",
      cacheKey([limit, version.count, version.maxId, version.lastTimestamp, version.fingerprint]),
      5_000,
      async () => buildSecurityReport(limit),
      ["security", "audit"]
    )
  );
}

function buildSecurityReport(limit: number) {
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT id, actor, action, target, detail, severity, timestamp
       FROM audit_log
       ORDER BY timestamp DESC
       LIMIT 250`
    )
    .all() as AuditRow[];

  const securityRows = rows.filter(isSecurityEvent);
  const timeline = securityRows.slice(0, limit).map((row) => ({
    ...row,
    detail: redactDetail(row.detail),
    blocked: isBlockedEvent(row),
  }));
  const auditActivity = rows.slice(0, limit).map((row) => ({
    ...row,
    detail: redactDetail(row.detail),
    blocked: isBlockedEvent(row),
    securityEvent: isSecurityEvent(row),
  }));

  return {
    summary: {
      status: statusFor(securityRows),
      securityEvents: securityRows.length,
      auditEvents: rows.length,
      highSeverity: securityRows.filter((row) => row.severity === "high").length,
      mediumSeverity: securityRows.filter((row) => row.severity === "medium").length,
      blockedAttempts: securityRows.filter(isBlockedEvent).length,
      lastEventAt: securityRows[0]?.timestamp ?? null,
      lastAuditAt: rows[0]?.timestamp ?? null,
      topActors: topActors(securityRows),
    },
    controls: [
      { id: "dispatch-policy", label: "Dispatch policy", status: "active" },
      { id: "a2a-policy", label: "A2A send policy", status: "active" },
      { id: "memory-write-policy", label: "Memory write policy", status: "active" },
      { id: "secret-redaction", label: "Dashboard redaction", status: "active" },
    ],
    timeline,
    auditActivity,
    timestamp: new Date().toISOString(),
  };
}
