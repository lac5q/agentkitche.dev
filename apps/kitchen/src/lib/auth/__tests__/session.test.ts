// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { signAccessToken } from '../jwt';
import type { UserRole } from '../types';

// Mock the DB module to avoid needing a real database.
// This is hoisted to module level by Vitest's vi.mock mechanism.
vi.mock('@/lib/db', () => ({
  getDb: () => ({
    prepare: () => ({
      get: () => undefined,
      run: () => undefined,
      all: () => [],
    }),
  }),
}));

// Set required env var for JWT tests
beforeEach(() => {
  process.env.MEMOROOS_JWT_SECRET = 'test-secret-that-is-long-enough-32ch';
});

describe('authenticateUser — JWT path', () => {
  it('resolves SessionUser from valid Authorization Bearer JWT', async () => {
    const { authenticateUser } = await import('../session');
    const token = await signAccessToken('user-123', 'operator');
    const req = new Request('http://localhost/', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const session = await authenticateUser(req);
    expect(session).not.toBeNull();
    expect(session!.userId).toBe('user-123');
    expect(session!.role).toBe('operator');
  });

  it('returns null for invalid JWT', async () => {
    const { authenticateUser } = await import('../session');
    const req = new Request('http://localhost/', {
      headers: { Authorization: 'Bearer not.a.valid.token' },
    });
    const session = await authenticateUser(req);
    expect(session).toBeNull();
  });

  it('returns null when no token present', async () => {
    const { authenticateUser } = await import('../session');
    const req = new Request('http://localhost/');
    const session = await authenticateUser(req);
    expect(session).toBeNull();
  });

  it('reads access_token from cookie as fallback', async () => {
    const { authenticateUser } = await import('../session');
    const token = await signAccessToken('user-cookie', 'reviewer');
    const req = new Request('http://localhost/', {
      headers: { Cookie: `access_token=${token}` },
    });
    const session = await authenticateUser(req);
    expect(session).not.toBeNull();
    expect(session!.userId).toBe('user-cookie');
    expect(session!.role).toBe('reviewer');
  });
});

describe('authenticateUser — API key path', () => {
  it('returns null for unknown API key (no DB match)', async () => {
    const { authenticateUser } = await import('../session');
    // A 64-char hex string looks like a user API key (no dots, not JWT-shaped)
    const fakeKey = 'a'.repeat(64);
    const req = new Request('http://localhost/', {
      headers: { Authorization: `Bearer ${fakeKey}` },
    });
    const session = await authenticateUser(req);
    // DB mock returns undefined for key lookup, so should return null
    expect(session).toBeNull();
  });
});
