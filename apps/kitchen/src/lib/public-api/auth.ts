/**
 * Phase 62: Public API tenant authentication.
 *
 * API keys are high-entropy random strings (>= 32 bytes of entropy).
 * SHA-256 is used for storage — not bcrypt — because:
 *   1. bcrypt is not a dependency of this project.
 *   2. The key_hash column has a UNIQUE index; bcrypt's per-call salt would
 *      produce a different hash for the same key on every call, making an
 *      indexed lookup impossible.
 * For high-entropy keys (>= 128-bit random), SHA-256 provides adequate
 * protection against database exposure.
 */
import crypto from "crypto";
import type Database from "better-sqlite3";

import { getDb } from "@/lib/db";

export interface TenantContext {
  tenantId: string;
  scopes: string[];
}

type ApiKeyRow = {
  tenant_id: string;
  scopes: string;
  revoked_at: string | null;
};

function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/**
 * Resolves a tenant from an HTTP Authorization header.
 *
 * Returns `TenantContext` on success, `null` if the header is missing,
 * the key is unknown, or the key has been revoked.
 */
export function authenticateTenantRequest(
  req: Request,
  db: Database.Database = getDb()
): TenantContext | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]) return null;

  const rawKey = match[1].trim();
  if (!rawKey) return null;

  const keyHash = hashApiKey(rawKey);

  const row = db
    .prepare(
      "SELECT tenant_id, scopes, revoked_at FROM tenant_api_keys WHERE key_hash = ?"
    )
    .get(keyHash) as ApiKeyRow | undefined;

  if (!row) return null;
  if (row.revoked_at !== null) return null;

  return {
    tenantId: row.tenant_id,
    scopes: row.scopes.split(",").map((s) => s.trim()).filter(Boolean),
  };
}
