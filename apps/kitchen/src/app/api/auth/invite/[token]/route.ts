import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { getDb } from '@/lib/db';
import type { UserRole } from '@/lib/auth/types';

type Ctx = { params: Promise<{ token: string }> };

type InviteRow = {
  role: UserRole;
  email_hint: string | null;
  used_at: string | null;
  expires_at: string;
};

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/invite/[token]
 * Validates an invite token without consuming it.
 * Returns role and emailHint if valid.
 */
export async function GET(_req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const tokenHash = createHash('sha256').update(token).digest('hex');

  const db = getDb();
  const invite = db
    .prepare(
      'SELECT role, email_hint, used_at, expires_at FROM team_invitations WHERE token_hash = ?'
    )
    .get(tokenHash) as InviteRow | undefined;

  if (!invite) {
    return Response.json({ error: 'invalid or expired invitation' }, { status: 404 });
  }

  if (invite.used_at) {
    return Response.json({ error: 'invitation already used' }, { status: 404 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return Response.json({ error: 'invitation expired' }, { status: 404 });
  }

  return Response.json({
    role: invite.role,
    emailHint: invite.email_hint ?? undefined,
  });
}
