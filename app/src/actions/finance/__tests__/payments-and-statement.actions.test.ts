import { before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

// Contract tests for Slice S02.
// Expected to be RED until T02 implements schema + actions for payments + statement.
//
// Seams used (repo pattern):
// - globalThis.__TEST_SESSION__ (wired via '@/auth' auth() override)
// - globalThis.__TEST_PRISMA__ (wired via '@/lib/prisma' + getTestPrisma)

type DB = typeof prisma;

function setTestSession(session: any) {
  (globalThis as any).__TEST_SESSION__ = session;
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

function getDb(): DB {
  return prisma as any;
}

async function resetDb(db: any) {
  // Best-effort cleanup. During T01, some models might not exist yet.
  const candidates = [
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
    const model = db?.[modelName];
    if (model?.deleteMany) {
      try {
        await model.deleteMany({});
      } catch {
        // ignore until schema exists
      }
    }
  }
}

describe('finance.s02 payments + statement contract (S02)', { skip: false }, () => {
  let financePayments: any;
  let financeStatement: any;

  before(async () => {
    // Expected to fail (RED) until implementation exists.
    financePayments = await import('../payments');
    financeStatement = await import('../statements');
  });

  beforeEach(async () => {
    const db = getDb() as any;
    await resetDb(db);
    clearTestSession();
  });

  it('Admin can record manual payment in same-tenant charge; statement balance updates deterministically (charges - payments)', async () => {
    const db = getDb() as any;

    const tenantA = await db.tenant.create({ data: { name: 'Tenant A', slug: 'tenant-a' } });

    // Users are optional for session seam, but keep IDs stable.
    const adminUserId = 'user-admin-a';

    // Guardian/Parent + relationship
    const guardianA = await db.guardian.create({ data: { tenantId: tenantA.id, fullName: 'Parent A' } });

    const studentOwned = await db.student.create({
      data: { tenantId: tenantA.id, firstName: 'Owned', lastName: 'Student' },
    });

    await db.studentGuardian.create({
      data: { tenantId: tenantA.id, guardianId: guardianA.id, studentId: studentOwned.id, isPrimary: true },
    });

    const concept = await db.financeConcept.create({
      data: {
        tenantId: tenantA.id,
        name: 'Colegiatura',
        kind: 'monthly',
        amountCents: 100_00,
        currency: 'MXN',
      },
    });

    const charge = await db.financeCharge.create({
      data: {
        tenantId: tenantA.id,
        studentId: studentOwned.id,
        conceptId: concept.id,
        amountCents: 100_00,
        currency: 'MXN',
        periodKey: '2026-03',
      },
    });

    setTestSession({
      user: {
        id: adminUserId,
        tenantId: tenantA.id,
        tenantSlug: tenantA.slug,
        role: 'admin',
        roles: ['admin'],
      },
    });

    const createdPayment = await financePayments.recordManual({
      chargeId: charge.id,
      amountCents: 25_00,
      paidAt: new Date('2026-03-05T12:00:00.000Z'),
      note: 'cash',
    });

    assert.ok(createdPayment?.id, 'expected recordManual() to return created payment');

    // Deterministic balance rule for MVP:
    // balanceDueCents = sum(charges.amountCents) - sum(payments.amountCents)
    setTestSession({
      user: {
        id: 'user-parent-a',
        tenantId: tenantA.id,
        tenantSlug: tenantA.slug,
        role: 'parent',
        roles: ['parent'],
        guardianId: guardianA.id,
      },
    });

    const statement = await financeStatement.getForParent();
    assert.equal(statement?.students?.length, 1);

    const s0 = statement.students[0];
    assert.equal(s0.studentId, studentOwned.id);

    assert.equal(s0.totals.chargesCents, 100_00);
    assert.equal(s0.totals.paymentsCents, 25_00);
    assert.equal(s0.totals.balanceDueCents, 75_00);
  });

  it('tenant-scope: Admin cannot record payment against charge in other tenant (stable error; no data leakage)', async () => {
    const db = getDb() as any;

    const tenantA = await db.tenant.create({ data: { name: 'Tenant A', slug: 'tenant-a' } });
    const tenantB = await db.tenant.create({ data: { name: 'Tenant B', slug: 'tenant-b' } });

    // Charge in tenant B
    const studentB = await db.student.create({ data: { tenantId: tenantB.id, firstName: 'B', lastName: 'Student' } });
    const conceptB = await db.financeConcept.create({
      data: { tenantId: tenantB.id, name: 'Colegiatura B', kind: 'monthly', amountCents: 100_00, currency: 'MXN' },
    });
    const chargeB = await db.financeCharge.create({
      data: {
        tenantId: tenantB.id,
        studentId: studentB.id,
        conceptId: conceptB.id,
        amountCents: 100_00,
        currency: 'MXN',
        periodKey: '2026-03',
      },
    });

    setTestSession({
      user: {
        id: 'user-admin-a',
        tenantId: tenantA.id,
        tenantSlug: tenantA.slug,
        role: 'admin',
        roles: ['admin'],
      },
    });

    // Contract: error must be stable. Implementation may choose either:
    // - FINANCE_SCOPE_VIOLATION (explicit)
    // - FINANCE_CHARGE_NOT_FOUND (redacted)
    await assert.rejects(
      () =>
        financePayments.recordManual({
          chargeId: chargeB.id,
          amountCents: 10_00,
          paidAt: new Date('2026-03-05T12:00:00.000Z'),
        }),
      /(FINANCE_SCOPE_VIOLATION|FINANCE_CHARGE_NOT_FOUND)/
    );
  });

  it('parent-scope: getForParent returns only students associated to this parent; excludes other students charges/payments', async () => {
    const db = getDb() as any;

    const tenantA = await db.tenant.create({ data: { name: 'Tenant A', slug: 'tenant-a' } });

    const guardianA = await db.guardian.create({ data: { tenantId: tenantA.id, fullName: 'Parent A' } });

    const studentOwned = await db.student.create({ data: { tenantId: tenantA.id, firstName: 'Owned', lastName: 'Student' } });
    const studentOther = await db.student.create({ data: { tenantId: tenantA.id, firstName: 'Other', lastName: 'Student' } });

    await db.studentGuardian.create({
      data: { tenantId: tenantA.id, guardianId: guardianA.id, studentId: studentOwned.id, isPrimary: true },
    });

    const concept = await db.financeConcept.create({
      data: { tenantId: tenantA.id, name: 'Colegiatura', kind: 'monthly', amountCents: 100_00, currency: 'MXN' },
    });

    // Charges for both students
    const ownedCharge = await db.financeCharge.create({
      data: { tenantId: tenantA.id, studentId: studentOwned.id, conceptId: concept.id, amountCents: 100_00, currency: 'MXN', periodKey: '2026-03' },
    });

    const otherCharge = await db.financeCharge.create({
      data: { tenantId: tenantA.id, studentId: studentOther.id, conceptId: concept.id, amountCents: 50_00, currency: 'MXN', periodKey: '2026-03' },
    });

    // Payment applied to other student charge (should not appear)
    setTestSession({
      user: { id: 'user-admin-a', tenantId: tenantA.id, tenantSlug: tenantA.slug, role: 'admin', roles: ['admin'] },
    });

    await financePayments.recordManual({ chargeId: otherCharge.id, amountCents: 50_00, paidAt: new Date('2026-03-06T12:00:00.000Z') });

    // Parent reads
    setTestSession({
      user: {
        id: 'user-parent-a',
        tenantId: tenantA.id,
        tenantSlug: tenantA.slug,
        role: 'parent',
        roles: ['parent'],
        guardianId: guardianA.id,
      },
    });

    const statement = await financeStatement.getForParent();

    const studentIds = new Set(statement.students.map((s: any) => s.studentId));
    assert.deepEqual([...studentIds], [studentOwned.id]);

    const s0 = statement.students[0];
    const chargeIds = new Set(s0.charges.map((c: any) => c.id));
    assert.equal(chargeIds.has(ownedCharge.id), true);
    assert.equal(chargeIds.has(otherCharge.id), false);

    // Totals should only consider owned student
    assert.equal(s0.totals.chargesCents, 100_00);
  });

  it('validation: invalid amount (<= 0) throws stable error FINANCE_PAYMENT_INVALID_AMOUNT', async () => {
    const db = getDb() as any;

    const tenantA = await db.tenant.create({ data: { name: 'Tenant A', slug: 'tenant-a' } });

    const guardianA = await db.guardian.create({ data: { tenantId: tenantA.id, fullName: 'Parent A' } });
    const studentOwned = await db.student.create({ data: { tenantId: tenantA.id, firstName: 'Owned', lastName: 'Student' } });
    await db.studentGuardian.create({
      data: { tenantId: tenantA.id, guardianId: guardianA.id, studentId: studentOwned.id, isPrimary: true },
    });

    const concept = await db.financeConcept.create({
      data: { tenantId: tenantA.id, name: 'Colegiatura', kind: 'monthly', amountCents: 100_00, currency: 'MXN' },
    });

    const charge = await db.financeCharge.create({
      data: { tenantId: tenantA.id, studentId: studentOwned.id, conceptId: concept.id, amountCents: 100_00, currency: 'MXN', periodKey: '2026-03' },
    });

    setTestSession({
      user: { id: 'user-admin-a', tenantId: tenantA.id, tenantSlug: tenantA.slug, role: 'admin', roles: ['admin'] },
    });

    await assert.rejects(
      () => financePayments.recordManual({ chargeId: charge.id, amountCents: 0, paidAt: new Date('2026-03-05T12:00:00.000Z') }),
      /FINANCE_PAYMENT_INVALID_AMOUNT/
    );
  });
});
