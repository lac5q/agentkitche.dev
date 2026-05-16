import { verifyAccessToken } from './jwt';
import type { SessionUser } from './types';

/**
 * Reads Bearer token from Authorization header or access_token cookie.
 * Verifies the JWT and returns a SessionUser, or null if invalid.
 */
export async function authenticateUser(req: Request): Promise<SessionUser | null> {
  let token: string | null = null;

  // 1. Authorization: Bearer <token>
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  // 2. access_token cookie fallback
  if (!token) {
    const cookieHeader = req.headers.get('cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
      if (match) token = decodeURIComponent(match[1]);
    }
  }

  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  return {
    userId: payload.sub,
    role: payload.role,
    // email and displayName are not in the JWT — callers that need them
    // must fetch from DB. Provide safe defaults here.
    email: '',
    displayName: '',
    tenantId: 'default-tenant',
  };
}
