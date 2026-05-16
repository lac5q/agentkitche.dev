import { randomBytes } from 'crypto';
import type Database from 'better-sqlite3';
import { hashPassword } from './password';

/**
 * Seeds the default admin user on first startup.
 * Runs only when the users table is empty.
 * Reads MEMOROOS_ADMIN_EMAIL and MEMOROOS_ADMIN_PASSWORD env vars.
 */
export async function seedDefaultAdmin(db: Database.Database): Promise<void> {
  const count = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }).cnt;
  if (count > 0) return;

  const email = process.env.MEMOROOS_ADMIN_EMAIL;
  const password = process.env.MEMOROOS_ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      '[Memoroos] No users exist. Set MEMOROOS_ADMIN_EMAIL and MEMOROOS_ADMIN_PASSWORD to create the first admin.'
    );
    return;
  }

  const userId = randomBytes(10).toString('hex');
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  db.prepare(
    'INSERT INTO users (id, email, display_name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(userId, email, email.split('@')[0], passwordHash, now);

  db.prepare('INSERT INTO user_roles (user_id, role) VALUES (?, ?)').run(userId, 'admin');

  console.info(`[Memoroos] Admin user created: ${email}`);
}
