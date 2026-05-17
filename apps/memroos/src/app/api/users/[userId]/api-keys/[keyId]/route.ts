import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { authenticateUser } from '@/lib/auth/session';

type Ctx = { params: Promise<{ userId: string; keyId: string }> };

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const session = await authenticateUser(req);
  if (!session) {
    return Response.json({ error: 'authentication required' }, { status: 401 });
  }

  const { userId, keyId } = await ctx.params;

  // Users can only revoke their own keys; admin can revoke for any user
  if (session.userId !== userId && session.role !== 'admin') {
    return Response.json({ error: 'insufficient permissions' }, { status: 403 });
  }

  const db = getDb();

  type KeyRow = { id: string; user_id: string; revoked_at: string | null };
  const key = db
    .prepare('SELECT id, user_id, revoked_at FROM user_api_keys WHERE id = ?')
    .get(keyId) as KeyRow | undefined;

  if (!key || key.user_id !== userId) {
    return Response.json({ error: 'api key not found' }, { status: 404 });
  }

  if (key.revoked_at) {
    return Response.json({ error: 'api key already revoked' }, { status: 409 });
  }

  db.prepare('UPDATE user_api_keys SET revoked_at = ? WHERE id = ?').run(
    new Date().toISOString(),
    keyId
  );

  return new Response(null, { status: 204 });
}
