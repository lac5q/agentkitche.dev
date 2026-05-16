import { NextRequest } from 'next/server';
import { createHash, randomBytes } from 'crypto';
import { getDb } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { signAccessToken } from '@/lib/auth/jwt';
import type { UserRole } from '@/lib/auth/types';

interface RegisterBody {
  email: string;
  password: string;
  displayName?: string;
  inviteToken?: string;
}

type InviteRow = { role: UserRole; email_hint: string | null; used_at: string | null; expires_at: string };

export async function POST(req: NextRequest) {
  let body: RegisterBody;
  try {
    body = (await req.json()) as RegisterBody;
  } catch {
    return Response.json({ error: 'invalid request body' }, { status: 400 });
  }

  const { email, password, displayName = '', inviteToken } = body;
  if (!email || !password) {
    return Response.json({ error: 'email and password are required' }, { status: 400 });
  }

  const db = getDb();

  // Check if this is a first-user bootstrap or invite-token registration
  const userCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }).cnt;

  let role: UserRole = 'reviewer';

  if (userCount === 0) {
    // First user becomes admin — no invite token required
    role = 'admin';
  } else {
    // Must have a valid, unused invite token
    if (!inviteToken) {
      return Response.json({ error: 'invite token required' }, { status: 403 });
    }
    const tokenHash = createHash('sha256').update(inviteToken).digest('hex');
    const invite = db
      .prepare('SELECT role, email_hint, used_at, expires_at FROM team_invitations WHERE token_hash = ?')
      .get(tokenHash) as InviteRow | undefined;

    if (!invite) {
      return Response.json({ error: 'invalid or expired invitation' }, { status: 404 });
    }
    if (invite.used_at) {
      return Response.json({ error: 'invitation already used' }, { status: 409 });
    }
    if (new Date(invite.expires_at) < new Date()) {
      return Response.json({ error: 'invitation expired' }, { status: 410 });
    }
    role = invite.role;

    // Mark invite used
    db.prepare('UPDATE team_invitations SET used_at = ? WHERE token_hash = ?').run(
      new Date().toISOString(),
      tokenHash
    );
  }

  // Check email not already taken
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return Response.json({ error: 'email already registered' }, { status: 409 });
  }

  const userId = randomBytes(10).toString('hex');
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, email, displayName || email.split('@')[0], passwordHash, now);

  db.prepare('INSERT INTO user_roles (user_id, role) VALUES (?, ?)').run(userId, role);

  const accessToken = await signAccessToken(userId, role);

  return Response.json({ accessToken, userId }, { status: 201 });
}
