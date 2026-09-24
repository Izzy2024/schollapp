import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';

describe('hasPermission (granular RBAC) — NO mock.module', () => {
  beforeEach(() => {
    delete (globalThis as any).__TEST_PRISMA__;
  });

  it('grants access only through a Role that actually has the RolePermission row, scoped per tenant', async () => {
    const now = Date.now();

    const [tenantA, tenantB] = await Promise.all([
      prisma.tenant.create({ data: { slug: `t-rbac-a-${now}`, name: 'Tenant A', timezone: 'America/Mexico_City' } }),
      prisma.tenant.create({ data: { slug: `t-rbac-b-${now}`, name: 'Tenant B', timezone: 'America/Mexico_City' } }),
    ]);

    const permission = await prisma.permission.upsert({
      where: { code: 'test:special-write' },
      update: {},
      create: { code: 'test:special-write', description: 'test-only permission' },
    });

    const roleWithPerm = await prisma.role.create({ data: { tenantId: tenantA.id, name: 'special' } });
    await prisma.rolePermission.create({ data: { roleId: roleWithPerm.id, permissionId: permission.id } });

    const roleWithoutPerm = await prisma.role.create({ data: { tenantId: tenantA.id, name: 'plain' } });

    const roleInOtherTenant = await prisma.role.create({ data: { tenantId: tenantB.id, name: 'special' } });
    await prisma.rolePermission.create({ data: { roleId: roleInOtherTenant.id, permissionId: permission.id } });

    const userWithPerm = await prisma.user.create({ data: { email: `has-${now}@ex.com`, fullName: 'Has', passwordHash: 'x', isActive: true } });
    await prisma.userRole.create({ data: { tenantId: tenantA.id, userId: userWithPerm.id, roleId: roleWithPerm.id } });

    const userWithoutPerm = await prisma.user.create({ data: { email: `hasnt-${now}@ex.com`, fullName: 'HasNot', passwordHash: 'x', isActive: true } });
    await prisma.userRole.create({ data: { tenantId: tenantA.id, userId: userWithoutPerm.id, roleId: roleWithoutPerm.id } });

    assert.equal(await hasPermission(tenantA.id, userWithPerm.id, 'test:special-write'), true);
    assert.equal(await hasPermission(tenantA.id, userWithoutPerm.id, 'test:special-write'), false);
    // Same user/role/permission exists, but in a different tenant — must not leak across tenants.
    assert.equal(await hasPermission(tenantB.id, userWithPerm.id, 'test:special-write'), false);
  });
});
