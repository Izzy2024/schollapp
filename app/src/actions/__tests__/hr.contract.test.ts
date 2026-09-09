import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import {
  createContract,
  endContract,
  getContracts,
  createPayrollPeriod,
  addPayrollEntry,
  markEntryPaid,
  getPayrollEntries,
  getMyPayrollEntries,
} from '@/actions/hr';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

async function makeSetup() {
  const now = Date.now();
  const tenant = await prisma.tenant.create({
    data: { slug: `t-hr-${now}-${Math.random().toString(36).slice(2)}`, name: 'Tenant HR', timezone: 'America/Mexico_City' },
  });
  const admin = await prisma.user.create({
    data: { email: `admin-${now}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });

  const teacherUser = await prisma.user.create({
    data: { email: `teacher-${now}@ex.com`, fullName: 'Docente', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: teacherUser.id, status: 'active' } });
  const staff = await prisma.staff.create({ data: { tenantId: tenant.id, fullName: 'Docente', userId: teacherUser.id, isActive: true } });

  return { tenant, admin, teacherUser, staff };
}

describe('HR/payroll contract (contracts + payroll periods/entries) — NO mock.module', () => {
  it('full flow: create contract, create payroll period, add entry computes net, mark paid, staff sees own entry', async () => {
    const { tenant, admin, teacherUser, staff } = await makeSetup();

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });

    const contractResult = await createContract({
      staffId: staff.id,
      position: 'Docente de Matemáticas',
      salaryCents: 150000,
      contractType: 'full_time',
      startDateIso: new Date('2026-01-01').toISOString(),
    });
    assert.deepEqual(contractResult, { success: true });

    const contracts = await getContracts();
    assert.equal(contracts.length, 1);
    assert.equal(contracts[0].isActive, true);

    const periodResult = await createPayrollPeriod({
      name: 'Enero 2026',
      startDateIso: new Date('2026-01-01').toISOString(),
      endDateIso: new Date('2026-01-31').toISOString(),
    });
    assert.deepEqual(periodResult, { success: true });

    const period = await prisma.payrollPeriod.findFirstOrThrow({ where: { tenantId: tenant.id, name: 'Enero 2026' } });

    const entryResult = await addPayrollEntry(period.id, { staffId: staff.id, grossCents: 150000, deductionsCents: 15000 });
    assert.deepEqual(entryResult, { success: true });

    // Adding a second entry for the same staff+period is rejected.
    const duplicateEntry = await addPayrollEntry(period.id, { staffId: staff.id, grossCents: 150000, deductionsCents: 15000 });
    assert.deepEqual(duplicateEntry, { error: 'PAYROLL_ENTRY_EXISTS' });

    const entries = await getPayrollEntries(period.id);
    assert.ok(Array.isArray(entries));
    if (Array.isArray(entries)) {
      assert.equal(entries.length, 1);
      assert.equal(entries[0].netCents, 135000);
      assert.equal(entries[0].paidAt, null);

      await markEntryPaid(entries[0].id);
      const afterPaid = await getPayrollEntries(period.id);
      assert.ok(Array.isArray(afterPaid));
      if (Array.isArray(afterPaid)) assert.ok(afterPaid[0].paidAt);
    }

    const endResult = await endContract(contracts[0].id);
    assert.deepEqual(endResult, { success: true });
    const contractsAfterEnd = await getContracts();
    assert.equal(contractsAfterEnd[0].isActive, false);
    clearTestSession();

    // Staff sees their own payslip.
    setTestSession({ id: teacherUser.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    const myEntries = await getMyPayrollEntries();
    assert.equal(myEntries.length, 1);
    assert.equal(myEntries[0].netCents, 135000);
    assert.ok(myEntries[0].paidAt);
    clearTestSession();
  });

  it('rejects a non-admin/director role for contract and payroll management', async () => {
    const { tenant, teacherUser, staff } = await makeSetup();

    setTestSession({ id: teacherUser.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    await assert.rejects(
      () => createContract({ staffId: staff.id, position: 'x', salaryCents: 1000, contractType: 'full_time', startDateIso: new Date().toISOString() }),
      /HR_FORBIDDEN/
    );
    clearTestSession();
  });

  it('a staff member with no contracts/entries sees an empty payslip list, not an error', async () => {
    const { tenant, admin } = await makeSetup();
    const now = Date.now();
    const otherTeacherUser = await prisma.user.create({
      data: { email: `other-teacher-${now}@ex.com`, fullName: 'Otro Docente', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: otherTeacherUser.id, status: 'active' } });
    await prisma.staff.create({ data: { tenantId: tenant.id, fullName: 'Otro Docente', userId: otherTeacherUser.id, isActive: true } });

    setTestSession({ id: otherTeacherUser.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    const entries = await getMyPayrollEntries();
    assert.deepEqual(entries, []);
    clearTestSession();

    void admin;
  });
});
