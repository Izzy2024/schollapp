import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';
import { requireTenant, requirePermission } from '@/lib/authz';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/rbac-defaults';
import { STABLE_ERROR } from '@/lib/errors';
import { seedPermission } from '@/test/factories/rbac';

function setTestSession(user?: { id: string; tenantSlug?: string; roles?: string[] }) {
  if (user) {
    (globalThis as any).__TEST_SESSION__ = { user };
  } else {
    delete (globalThis as any).__TEST_SESSION__;
  }
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

describe('Authz central guards (requireTenant, requirePermission)', () => {
  beforeEach(() => {
    clearTestSession();
  });

  it('sin sesión → requireTenant rechaza con UNAUTHORIZED_ROLE', async () => {
    clearTestSession();
    await assert.rejects(
      async () => requireTenant(),
      (err: any) => err.message === STABLE_ERROR.UNAUTHORIZED_ROLE
    );
  });

  it('sesión con tenantSlug inexistente → TENANT_NOT_FOUND', async () => {
    const now = Date.now();
    const user = await prisma.user.create({
      data: {
        email: `authz-user-${now}-${Math.random().toString(36).slice(2)}@ex.com`,
        fullName: 'Test User',
        passwordHash: 'x',
        isActive: true,
      },
    });

    setTestSession({
      id: user.id,
      tenantSlug: `non-existent-tenant-${now}-${Math.random().toString(36).slice(2)}`,
      roles: ['admin'],
    });

    await assert.rejects(
      async () => requireTenant(),
      (err: any) => err.message === STABLE_ERROR.TENANT_NOT_FOUND
    );
  });

  it('con sesión pero sin permiso → requirePermission(\'settings:manage\') rechaza con UNAUTHORIZED_ROLE', async () => {
    const now = Date.now();
    const tenant = await prisma.tenant.create({
      data: {
        slug: `t-authz-${now}-${Math.random().toString(36).slice(2)}`,
        name: 'Tenant Authz Test',
        timezone: 'America/Mexico_City',
      },
    });

    const user = await prisma.user.create({
      data: {
        email: `authz-noperm-${now}-${Math.random().toString(36).slice(2)}@ex.com`,
        fullName: 'User Without Permission',
        passwordHash: 'x',
        isActive: true,
      },
    });

    await prisma.userMembership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        status: 'active',
      },
    });

    setTestSession({
      id: user.id,
      tenantSlug: tenant.slug,
      roles: ['teacher'],
    });

    await assert.rejects(
      async () => requirePermission('settings:manage'),
      (err: any) => err.message === STABLE_ERROR.UNAUTHORIZED_ROLE
    );
  });

  it('tras seedPermission(tenant.id, user.id, \'settings:manage\') → devuelve el contexto correcto', async () => {
    const now = Date.now();
    const tenant = await prisma.tenant.create({
      data: {
        slug: `t-authz-perm-${now}-${Math.random().toString(36).slice(2)}`,
        name: 'Tenant Authz Perm Test',
        timezone: 'America/Mexico_City',
      },
    });

    const user = await prisma.user.create({
      data: {
        email: `authz-hasperm-${now}-${Math.random().toString(36).slice(2)}@ex.com`,
        fullName: 'User With Permission',
        passwordHash: 'x',
        isActive: true,
      },
    });

    await prisma.userMembership.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        status: 'active',
      },
    });

    setTestSession({
      id: user.id,
      tenantSlug: tenant.slug,
      roles: ['admin'],
    });

    await seedPermission(tenant.id, user.id, 'settings:manage');

    const ctx = await requirePermission('settings:manage');
    assert.deepEqual(ctx, {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      userId: user.id,
      roles: ['admin'],
    });
  });

  it('DEFAULT_ROLE_PERMISSIONS.admin y .director incluyen academic:manage y settings:manage, student no', () => {
    assert.ok(DEFAULT_ROLE_PERMISSIONS.admin.includes('academic:manage'), 'admin should include academic:manage');
    assert.ok(DEFAULT_ROLE_PERMISSIONS.admin.includes('settings:manage'), 'admin should include settings:manage');
    assert.ok(DEFAULT_ROLE_PERMISSIONS.director.includes('academic:manage'), 'director should include academic:manage');
    assert.ok(DEFAULT_ROLE_PERMISSIONS.director.includes('settings:manage'), 'director should include settings:manage');

    assert.equal(DEFAULT_ROLE_PERMISSIONS.student.includes('academic:manage'), false, 'student must not include academic:manage');
    assert.equal(DEFAULT_ROLE_PERMISSIONS.student.includes('settings:manage'), false, 'student must not include settings:manage');
  });
});
