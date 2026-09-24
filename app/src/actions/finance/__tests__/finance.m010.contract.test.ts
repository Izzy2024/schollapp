import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

// M010 verification suite: sibling discounts + payment plans.
// Conventions: no node:test mock.module — use the __TEST_SESSION__ seam. See finance.contract.test.ts.

type DB = typeof prisma;

type TestSession = {
  user?: {
    id: string;
    tenantId?: string;
    tenantSlug?: string;
    role?: string;
    roles?: string[];
  };
};

function setTestSession(session: TestSession) {
  const g = globalThis as unknown as { __TEST_SESSION__?: TestSession };
  g.__TEST_SESSION__ = session;
}

function clearTestSession() {
  const g = globalThis as unknown as { __TEST_SESSION__?: TestSession };
  delete g.__TEST_SESSION__;
}

function getDb(): DB {
  return prisma;
}

// DB-backed hasPermission() needs a real Permission + Role + UserRole row.
// Replicates the seed pattern from src/lib/__tests__/rbac.test.ts.
async function seedFinanceWriteAccess(tenantId: string, userId: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: `${userId}@test.local`,
      passwordHash: 'x',
      fullName: userId,
      isActive: true,
    },
  });
  const permission = await prisma.permission.upsert({
    where: { code: 'finance:write' },
    update: {},
    create: { code: 'finance:write', description: 'test seed: finance write access' },
  });
  const role = await prisma.role.create({ data: { tenantId, name: `finance-writer-${userId}` } });
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
  await prisma.userRole.create({ data: { tenantId, userId, roleId: role.id } });
}

async function resetDb(db: DB) {
  const candidates = [
    'activityEvent',
    'financePaymentInstallment',
    'financePaymentPlan',
    'financeDiscount',
    'financePayment',
    'financeCharge',
    'financeConcept',
    'studentGuardian',
    'guardian',
    'student',
    'user',
    'tenant',
  ];
  for (const modelName of candidates) {
    const model = (db as any)?.[modelName];
    if (model?.deleteMany) {
      try {
        await model.deleteMany({});
      } catch {
        // ignore: model might not exist in earlier migrations
      }
    }
  }
}

describe('M010 finance contracts (sibling discounts + payment plans) — NO mock.module', () => {
  beforeEach(async () => {
    await resetDb(getDb());
    clearTestSession();
  });

  it('sibling discount reduces auto-generated enrollment charge when the minimum sibling count is met (repro: 200 base -> 180 with 10% sibling discount, siblingMinCount=1)', async () => {
    const discounts = await import('../discounts');
    const enrollmentCharges = await import('../enrollment-charges');

    const db = getDb();
    const tenant = await db.tenant.create({ data: { name: 'Tenant A', slug: 'tenant-a' } });
    const year = await db.academicYear.create({
      data: { tenantId: tenant.id, name: '2026', startDate: new Date('2026-01-05'), endDate: new Date('2026-11-30'), isActive: true },
    });

    const guardian = await db.guardian.create({ data: { tenantId: tenant.id, fullName: 'Parent' } });
    const student1 = await db.student.create({ data: { tenantId: tenant.id, firstName: 'S', lastName: 'One', status: 'active' } });
    const student2 = await db.student.create({ data: { tenantId: tenant.id, firstName: 'S', lastName: 'Two', status: 'active' } });
    await db.studentGuardian.create({ data: { tenantId: tenant.id, guardianId: guardian.id, studentId: student1.id, isPrimary: true } });
    await db.studentGuardian.create({ data: { tenantId: tenant.id, guardianId: guardian.id, studentId: student2.id, isPrimary: true } });

    const concept = await db.financeConcept.create({
      data: {
        tenantId: tenant.id,
        name: 'Matrícula',
        kind: 'one_time',
        amountCents: 200_00,
        currency: 'USD',
        autoGenerateOnEnrollment: true,
        chargeType: 'enrollment',
        applySiblingDiscount: true,
      },
    });

    setTestSession({ user: { id: 'user-admin-a', tenantId: tenant.id, tenantSlug: tenant.slug, role: 'admin', roles: ['admin'] } });
    await seedFinanceWriteAccess(tenant.id, 'user-admin-a');

    await discounts.create({
      name: 'Descuento hermanos',
      kind: 'sibling',
      percentage: 10,
      appliesTo: 'enrollment',
      siblingMinCount: 1, // requires at least 1 OTHER sibling (i.e. a 2+ children family)
    });

    const result = await enrollmentCharges.generateEnrollmentCharges(student1.id, 'enrollment-1', 'enrollment_only', year.id);

    assert.equal(result.charges.length, 1);
    assert.equal(result.charges[0].amountCents, 180_00, 'sibling discount contract broken: expected 200 - 10% = 180');
    assert.equal(result.charges[0].discountCents, 20_00);

    const usedDiscount = await db.financeDiscount.findFirst({ where: { tenantId: tenant.id, kind: 'sibling' } });
    assert.equal(usedDiscount?.currentUses, 1, 'discount usage counter must increment exactly once');
  });

  it('payment plan splits a charge into installments and marks the charge paid once all installments are paid (repro: 100 over 3 cuotas)', async () => {
    const financeCharges = await import('../charges');
    const paymentPlans = await import('../payment-plans');

    const db = getDb();
    const tenant = await db.tenant.create({ data: { name: 'Tenant A', slug: 'tenant-a' } });
    const student = await db.student.create({ data: { tenantId: tenant.id, firstName: 'S', lastName: 'One', status: 'active' } });
    const concept = await db.financeConcept.create({
      data: { tenantId: tenant.id, name: 'Matrícula', kind: 'one_time', amountCents: 100_00, currency: 'USD' },
    });

    setTestSession({ user: { id: 'user-admin-a', tenantId: tenant.id, tenantSlug: tenant.slug, role: 'admin', roles: ['admin'] } });
    await seedFinanceWriteAccess(tenant.id, 'user-admin-a');

    await financeCharges.generateForPeriod({ periodKey: '2026-01', conceptId: concept.id, studentIds: [student.id] });
    const [charge] = await db.financeCharge.findMany({ where: { tenantId: tenant.id, studentId: student.id } });
    assert.ok(charge?.id);

    const plan = await paymentPlans.createPaymentPlan({ chargeId: charge.id, installmentCount: 3, startDate: new Date('2026-02-01') });
    const withInstallments = await paymentPlans.getPaymentPlan(charge.id);
    assert.equal(withInstallments?.installments.length, 3);

    const sum = withInstallments!.installments.reduce((acc, i) => acc + i.amountCents, 0);
    assert.equal(sum, 100_00, 'installment amounts must sum exactly to the charge total (rounding remainder on last installment)');

    for (const installment of withInstallments!.installments) {
      await paymentPlans.recordInstallmentPayment({ installmentId: installment.id, paidAt: new Date('2026-02-05') });
    }

    const finalCharge = await db.financeCharge.findUnique({ where: { id: charge.id } });
    assert.equal(finalCharge?.status, 'paid', 'charge must be marked paid once all installments are paid');

    const finalPlan = await db.financePaymentPlan.findUnique({ where: { id: plan.id } });
    assert.equal(finalPlan?.status, 'completed');
    assert.equal(finalPlan?.installmentsPaid, 3);
  });
});
