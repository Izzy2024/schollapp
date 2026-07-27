import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { createAsset, getAssets, assignAsset, returnAsset, sendToMaintenance, retireAsset, getAssetLog } from '@/actions/inventory';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

async function makeTenantWithAdmin(slugPrefix: string) {
  const now = Date.now();
  const tenant = await prisma.tenant.create({
    data: { slug: `${slugPrefix}-${now}-${Math.random().toString(36).slice(2)}`, name: 'Tenant Inventory', timezone: 'America/Mexico_City' },
  });
  const admin = await prisma.user.create({
    data: { email: `admin-${now}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });
  return { tenant, admin };
}

describe('Inventory contract (assets lifecycle) — NO mock.module', () => {
  it('full lifecycle: create, assign, return, maintenance, retire, with a log entry for each step', async () => {
    const { tenant, admin } = await makeTenantWithAdmin('t-inv-flow');
    const now = Date.now();

    const teacherUser = await prisma.user.create({
      data: { email: `teacher-${now}@ex.com`, fullName: 'Docente', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: teacherUser.id, status: 'active' } });
    const staff = await prisma.staff.create({ data: { tenantId: tenant.id, fullName: 'Docente', userId: teacherUser.id, isActive: true } });

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });

    const created = await createAsset({ name: 'Proyector', category: 'Electrónica', serialNumber: 'SN-001' });
    assert.deepEqual(created, { success: true });

    let assets = await getAssets();
    assert.equal(assets.length, 1);
    assert.equal(assets[0].status, 'available');
    const assetId = assets[0].id;

    const assign = await assignAsset(assetId, staff.id);
    assert.deepEqual(assign, { success: true });

    assets = await getAssets();
    assert.equal(assets[0].status, 'assigned');
    assert.equal(assets[0].assignedToStaffName, 'Docente');

    const ret = await returnAsset(assetId);
    assert.deepEqual(ret, { success: true });
    assets = await getAssets();
    assert.equal(assets[0].status, 'available');
    assert.equal(assets[0].assignedToStaffName, null);

    const maint = await sendToMaintenance(assetId, 'Bombilla quemada');
    assert.deepEqual(maint, { success: true });
    assets = await getAssets();
    assert.equal(assets[0].status, 'maintenance');

    const retire = await retireAsset(assetId);
    assert.deepEqual(retire, { success: true });
    assets = await getAssets();
    assert.equal(assets[0].status, 'retired');

    const log = await getAssetLog(assetId);
    assert.equal(log.length, 4);
    assert.deepEqual(log.map((l) => l.action).sort(), ['assigned', 'maintenance', 'retired', 'returned']);

    clearTestSession();
  });

  it('rejects a non-admin/director role', async () => {
    const { tenant } = await makeTenantWithAdmin('t-inv-role');
    const now = Date.now();
    const teacher = await prisma.user.create({
      data: { email: `teacher-role-${now}@ex.com`, fullName: 'Teacher', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: teacher.id, status: 'active' } });

    setTestSession({ id: teacher.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    await assert.rejects(() => createAsset({ name: 'x' }), /UNAUTHORIZED_ROLE/);
    clearTestSession();
  });
});
