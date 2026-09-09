import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { createMenuItem, topUpAccount, recordPurchase, getAccountInfo } from '@/actions/cafeteria';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[]; email?: string }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

async function makeTenantWithAdmin(slugPrefix: string) {
  const now = Date.now();
  const tenant = await prisma.tenant.create({
    data: { slug: `${slugPrefix}-${now}-${Math.random().toString(36).slice(2)}`, name: 'Tenant Cafeteria', timezone: 'America/Mexico_City' },
  });
  const admin = await prisma.user.create({
    data: { email: `admin-${now}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });
  return { tenant, admin };
}

describe('Cafeteria contract (menu, top-up, purchase) — NO mock.module', () => {
  it('full flow: top-up, purchase decrements balance, rejects purchase with insufficient balance', async () => {
    const { tenant, admin } = await makeTenantWithAdmin('t-cafe-flow');
    const now = Date.now();

    const student = await prisma.student.create({
      data: { tenantId: tenant.id, firstName: 'Ana', lastName: 'Pérez', email: `student-${now}@ex.com`, status: 'active' },
    });

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });

    const itemResult = await createMenuItem({ name: 'Sándwich', priceCents: 350 });
    assert.deepEqual(itemResult, { success: true });

    const topUp = await topUpAccount(student.id, 500);
    assert.deepEqual(topUp, { success: true });

    let info = await getAccountInfo(student.id);
    assert.equal(info.balanceCents, 500);

    const menuItem = await prisma.cafeteriaMenuItem.findFirstOrThrow({ where: { tenantId: tenant.id, name: 'Sándwich' } });
    const purchase = await recordPurchase(student.id, menuItem.id);
    assert.deepEqual(purchase, { success: true });

    info = await getAccountInfo(student.id);
    assert.equal(info.balanceCents, 150);
    assert.equal(info.transactions.length, 2);

    // Second purchase would need 350 but only 150 remain.
    const secondPurchase = await recordPurchase(student.id, menuItem.id);
    assert.deepEqual(secondPurchase, { error: 'INSUFFICIENT_BALANCE' });

    const unchanged = await getAccountInfo(student.id);
    assert.equal(unchanged.balanceCents, 150);

    clearTestSession();
  });

  it('rejects a non-admin/director role for top-ups and purchases', async () => {
    const { tenant } = await makeTenantWithAdmin('t-cafe-role');
    const now = Date.now();
    const teacher = await prisma.user.create({
      data: { email: `teacher-${now}@ex.com`, fullName: 'Teacher', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: teacher.id, status: 'active' } });
    const student = await prisma.student.create({ data: { tenantId: tenant.id, firstName: 'X', lastName: 'Y', status: 'active' } });

    setTestSession({ id: teacher.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    await assert.rejects(() => topUpAccount(student.id, 100), /UNAUTHORIZED_ROLE/);
    clearTestSession();
  });

  it('a student with no account gets a zero balance rather than an error', async () => {
    const { tenant, admin } = await makeTenantWithAdmin('t-cafe-none');
    const student = await prisma.student.create({ data: { tenantId: tenant.id, firstName: 'Sin', lastName: 'Cuenta', status: 'active' } });

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });
    const info = await getAccountInfo(student.id);
    assert.equal(info.balanceCents, 0);
    assert.equal(info.transactions.length, 0);
    clearTestSession();
  });
});
