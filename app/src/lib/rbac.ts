import prisma from '@/lib/prisma';

/**
 * Checks a granular permission via Role -> RolePermission -> Permission,
 * scoped to the user's roles within a single tenant.
 *
 * ponytail: introduced as the foundation for real RBAC (see docs/GAP-ANALYSIS.md).
 * Existing action files still gate access by role-name string
 * (`roles.includes('admin')`) — migrating each one to `hasPermission()` is
 * incremental future work, since every contract test that sets up a session
 * via `__TEST_SESSION__` also needs a seeded Role/RolePermission/UserRole to
 * exercise the DB-backed check.
 */
export async function hasPermission(tenantId: string, userId: string, code: string): Promise<boolean> {
  const match = await prisma.userRole.findFirst({
    where: {
      tenantId,
      userId,
      role: { permissions: { some: { permission: { code } } } },
    },
  });

  return match !== null;
}
