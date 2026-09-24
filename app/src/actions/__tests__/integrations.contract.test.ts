import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { getIntegrationsStatus, getGoogleClassroomConnectUrl, disconnectGoogleClassroom, listGoogleClassroomCourses } from '@/actions/integrations';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

// DB-backed hasPermission() needs a real Permission + Role + UserRole row.
// Replicates the seed pattern from src/lib/__tests__/rbac.test.ts.
async function seedIntegrationsManage(tenantId: string, userId: string) {
  const permission = await prisma.permission.upsert({
    where: { code: 'integrations:manage' },
    update: {},
    create: { code: 'integrations:manage', description: 'test seed: integrations manage access' },
  });
  const role = await prisma.role.create({ data: { tenantId, name: `integrations-manager-${userId}` } });
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
  await prisma.userRole.create({ data: { tenantId, userId, roleId: role.id } });
}

async function makeTenantWithAdmin(slugPrefix: string) {
  const now = Date.now();
  const tenant = await prisma.tenant.create({
    data: { slug: `${slugPrefix}-${now}-${Math.random().toString(36).slice(2)}`, name: 'Tenant Integrations', timezone: 'America/Mexico_City' },
  });
  const admin = await prisma.user.create({
    data: { email: `admin-${now}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });
  await seedIntegrationsManage(tenant.id, admin.id);
  return { tenant, admin };
}

describe('External integrations contract — NO mock.module', () => {
  beforeEach(() => {
    delete (globalThis as any).__TEST_PRISMA__;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
  });

  it('lists Google Classroom as unavailable when not configured, and SIS Estatal as always unavailable', async () => {
    const { tenant, admin } = await makeTenantWithAdmin('t-integ-status');

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });
    const statuses = await getIntegrationsStatus();

    const classroom = statuses.find((s) => s.provider === 'google_classroom');
    assert.equal(classroom?.available, false);
    assert.equal(classroom?.connected, false);

    const sisEstatal = statuses.find((s) => s.provider === 'sis_estatal');
    assert.equal(sisEstatal?.available, false);
    assert.ok(sisEstatal?.unavailableReason);

    clearTestSession();
  });

  it('rejects generating a connect URL when Google credentials are not configured', async () => {
    const { tenant, admin } = await makeTenantWithAdmin('t-integ-notconfigured');

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });
    const result = await getGoogleClassroomConnectUrl();
    assert.deepEqual(result, { error: 'INTEGRATION_NOT_CONFIGURED' });
    clearTestSession();
  });

  it('rejects listing courses when not connected, and disconnect is a safe no-op if never connected', async () => {
    const { tenant, admin } = await makeTenantWithAdmin('t-integ-notconnected');

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });
    const result = await listGoogleClassroomCourses();
    assert.deepEqual(result, { error: 'INTEGRATION_NOT_CONNECTED' });

    const disconnectResult = await disconnectGoogleClassroom();
    assert.deepEqual(disconnectResult, { success: true });
    clearTestSession();
  });

  it('rejects a non-admin/director role', async () => {
    const { tenant } = await makeTenantWithAdmin('t-integ-role');
    const now = Date.now();
    const teacher = await prisma.user.create({
      data: { email: `teacher-${now}@ex.com`, fullName: 'Teacher', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: teacher.id, status: 'active' } });

    setTestSession({ id: teacher.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    await assert.rejects(() => getIntegrationsStatus(), /UNAUTHORIZED_ROLE/);
    clearTestSession();
  });
});
