import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

// M003 OFFICIAL VERIFICATION SUITE (Slice S04)
//
// Conventions:
// - DO NOT use `node:test` mock.module (fragile / not supported here).
// - If you need seams, use the official global seams wired by the app:
//   - globalThis.__TEST_SESSION__ via '@/auth' auth() override
//   - globalThis.__TEST_PRISMA__ via '@/lib/prisma' + getTestPrisma
//   See: app/src/lib/test-seams.ts

type DB = typeof prisma;

type TestSession = {
  user?: {
    id: string;
    tenantId?: string;
    tenantSlug?: string;
    role?: string;
    roles?: string[];
    guardianId?: string;
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

async function resetDb(db: DB) {
  // Best-effort cleanup. Keep it resilient to schema evolution.
  const candidates = [
    'activityEvent',
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
        // ignore: model might not exist in earlier migrations
      }
    }
  }
}

describe('M003 finance contracts (scope/RBAC/dedupe/balance) — NO mock.module', () => {
  beforeEach(async () => {
    const db = getDb();
    await resetDb(db);
    clearTestSession();
  });

  it('RBAC: parent cannot mutate finance (generateForPeriod, recordManual) -> stable error (repro: set parent session and call mutations)', async () => {
    const financeCharges = await import('../charges');
    const financePayments = await import('../payments');

    const db = getDb();
    const tenantA = await db.tenant.create({ data: { name: 'Tenant A', slug: 'tenant-a' } });

    const student = await db.student.create({ data: { tenantId: tenantA.id, firstName: 'S', lastName: 'One', status: 'active' } });
    const concept = await db.financeConcept.create({
      data: { tenantId: tenantA.id, name: 'Colegiatura', kind: 'monthly', amountCents: 100_00, currency: 'MXN' },
    });

    const charge = await db.financeCharge.create({
      data: {
        tenantId: tenantA.id,
        studentId: student.id,
        conceptId: concept.id,
        amountCents: 100_00,
        currency: 'MXN',
        periodKey: '2026-03',
        status: 'pending',
      },
    });

    setTestSession({
      user: {
        id: 'user-parent-a',
        tenantId: tenantA.id,
        tenantSlug: tenantA.slug,
        role: 'parent',
        roles: ['parent'],
        guardianId: 'guardian-a',
      },
    });

    await assert.rejects(
      () => financeCharges.generateForPeriod({ periodKey: '2026-03', conceptId: concept.id }),
      {
        message: /(FORBIDDEN|UNAUTHORIZED|UNAUTHORIZED_ROLE|FINANCE_FORBIDDEN|FINANCE_WRITE_FORBIDDEN|RBAC)/i,
      },
      'RBAC contract broken: parent must not be able to generate charges; expected stable forbidden-ish error'
    );

    await assert.rejects(
      () =>
        financePayments.recordManual({
          chargeId: charge.id,
          amountCents: 10_00,
          paidAt: new Date('2026-03-05T12:00:00.000Z'),
          note: 'cash',
        }),
      {
        message: /(FORBIDDEN|UNAUTHORIZED|UNAUTHORIZED_ROLE|FINANCE_FORBIDDEN|FINANCE_WRITE_FORBIDDEN|RBAC)/i,
      },
      'RBAC contract broken: parent must not be able to record payments; expected stable forbidden-ish error'
    );
  });

  it('dedupe/idempotency: generateForPeriod twice (same tenant+concept+period) does not duplicate charges (repro: call twice, expect createdCount second=0)', async () => {
    const financeCharges = await import('../charges');

    const db = getDb();
    const tenantA = await db.tenant.create({ data: { name: 'Tenant A', slug: 'tenant-a' } });

    // 2 active students to make it meaningful
    const s1 = await db.student.create({ data: { tenantId: tenantA.id, firstName: 'A', lastName: 'One', status: 'active' } });
    const s2 = await db.student.create({ data: { tenantId: tenantA.id, firstName: 'B', lastName: 'Two', status: 'active' } });

    const concept = await db.financeConcept.create({
      data: { tenantId: tenantA.id, name: 'Colegiatura', kind: 'monthly', amountCents: 100_00, currency: 'MXN' },
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

    const r1 = await financeCharges.generateForPeriod({ periodKey: '2026-03', conceptId: concept.id });
    const r2 = await financeCharges.generateForPeriod({ periodKey: '2026-03', conceptId: concept.id });

    // Contract: second run should be a no-op for already-existing charges.
    assert.equal(r1.createdCount, 2, 'dedupe contract broken: first run must create 2 charges (one per active student)');
    assert.equal(r2.createdCount, 0, 'dedupe contract broken: second run must not create new charges for same periodKey');
    assert.equal(r2.skippedCount, 2, 'dedupe contract broken: second run should report skippedCount=2 for existing charges');

    const charges = await db.financeCharge.findMany({ where: { tenantId: tenantA.id, conceptId: concept.id, periodKey: '2026-03' } });
    assert.equal(charges.length, 2, 'dedupe contract broken: DB must contain exactly 2 charges for tenant+concept+periodKey after two runs');

    // Ensure both students represented
    const studentIds = new Set(charges.map((c) => c.studentId));
    assert.equal(studentIds.has(s1.id), true);
    assert.equal(studentIds.has(s2.id), true);
  });

  it('balance determinism: statement totals = sum(charges) - sum(payments) for parent-visible students (repro: 100 charge, 25+10 payments => 65 due)', async () => {
    const financeCharges = await import('../charges');
    const financePayments = await import('../payments');
    const financeStatement = await import('../statements');

    const db = getDb();
    const tenantA = await db.tenant.create({ data: { name: 'Tenant A', slug: 'tenant-a' } });

    const guardianA = await db.guardian.create({ data: { tenantId: tenantA.id, fullName: 'Parent A' } });
    const studentOwned = await db.student.create({
      data: { tenantId: tenantA.id, firstName: 'Owned', lastName: 'Student', status: 'active' },
    });
    await db.studentGuardian.create({
      data: { tenantId: tenantA.id, guardianId: guardianA.id, studentId: studentOwned.id, isPrimary: true },
    });

    const concept = await db.financeConcept.create({
      data: { tenantId: tenantA.id, name: 'Colegiatura', kind: 'monthly', amountCents: 100_00, currency: 'MXN' },
    });

    // Generate charge
    setTestSession({
      user: { id: 'user-admin-a', tenantId: tenantA.id, tenantSlug: tenantA.slug, role: 'admin', roles: ['admin'] },
    });
    await financeCharges.generateForPeriod({ periodKey: '2026-03', conceptId: concept.id, studentIds: [studentOwned.id] });

    const [charge] = await db.financeCharge.findMany({ where: { tenantId: tenantA.id, studentId: studentOwned.id } });
    assert.ok(charge?.id);

    // Apply two payments
    await financePayments.recordManual({ chargeId: charge.id, amountCents: 25_00, paidAt: new Date('2026-03-05T12:00:00.000Z') });
    await financePayments.recordManual({ chargeId: charge.id, amountCents: 10_00, paidAt: new Date('2026-03-06T12:00:00.000Z') });

    // Parent reads statement
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
    assert.equal(statement.students.length, 1);

    const s0 = statement.students[0];
    assert.equal(s0.studentId, studentOwned.id);

    assert.equal(s0.totals.chargesCents, 100_00);
    assert.equal(s0.totals.paymentsCents, 35_00);
    assert.equal(s0.totals.balanceDueCents, 65_00);

    assert.equal(statement.totals.chargesCents, 100_00);
    assert.equal(statement.totals.paymentsCents, 35_00);
    assert.equal(statement.totals.balanceDueCents, 65_00);

  });
});
