import { NextRequest } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { getDb } from '@/lib/db';
import { authenticateUser } from '@/lib/auth/session';

type Ctx = { params: Promise<{ userId: string }> };

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, ctx: Ctx) {
  const session = await authenticateUser(req);
  if (!session) {
    return Response.json({ error: 'authentication required' }, { status: 401 });
  }

  const { userId } = await ctx.params;

  // Users can only create keys for themselves; admin can create for any user
  if (session.userId !== userId && session.role !== 'admin') {
    return Response.json({ error: 'insufficient permissions' }, { status: 403 });
  }

  let label = '';
  try {
    const body = (await req.json()) as { label?: string };
    label = typeof body.label === 'string' ? body.label : '';
  } catch {
    // label stays empty
  }

  const db = getDb();

  // Verify target user exists
  const targetUser = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as
    | { id: string }
    | undefined;
  if (!targetUser) {
    return Response.json({ error: 'user not found' }, { status: 404 });
  }

  // Generate 32-byte random key (hex-encoded = 64 chars)
  const keyRaw = randomBytes(32).toString('hex');
  const keyHash = createHash('sha256').update(keyRaw).digest('hex');
  const keyId = randomBytes(10).toString('hex');
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO user_api_keys (id, user_id, key_hash, label, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(keyId, userId, keyHash, label, now);

  return Response.json(
    {
      id: keyId,
      keyRaw,
      label,
      createdAt: now,
    },
    { status: 201 }
  );
}

export async function GET(req: NextRequest, ctx: Ctx) {
  const session = await authenticateUser(req);
  if (!session) {
    return Response.json({ error: 'authentication required' }, { status: 401 });
  }

  const { userId } = await ctx.params;

  // Users can only list their own keys; admin can list for any user
  if (session.userId !== userId && session.role !== 'admin') {
    return Response.json({ error: 'insufficient permissions' }, { status: 403 });
  }

  const db = getDb();

  type KeyRow = {
    id: string;
    label: string;
    created_at: string;
    last_used_at: string | null;
    revoked_at: string | null;
  };

  const keys = db
    .prepare(
      'SELECT id, label, created_at, last_used_at, revoked_at FROM user_api_keys WHERE user_id = ? AND revoked_at IS NULL ORDER BY created_at DESC'
    )
    .all(userId) as KeyRow[];

  return Response.json({
    apiKeys: keys.map((k) => ({
      id: k.id,
      label: k.label,
      createdAt: k.created_at,
      lastUsedAt: k.last_used_at,
    })),
  });
}
