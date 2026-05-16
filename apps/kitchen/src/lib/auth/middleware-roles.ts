import type { UserRole } from './types';

const ROLE_RANK: Record<UserRole, number> = {
  reviewer: 1,
  operator: 2,
  admin: 3,
};

/**
 * Returns a 403 Response if the user's role is below the required minimum.
 * Returns null if the role check passes.
 */
export function requireRole(
  userRole: UserRole | null | undefined,
  minRole: UserRole
): Response | null {
  if (!userRole || ROLE_RANK[userRole] < ROLE_RANK[minRole]) {
    return Response.json(
      { error: 'insufficient permissions' },
      { status: 403 }
    );
  }
  return null;
}

export { ROLE_RANK };
