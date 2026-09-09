import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

// M003 OFFICIAL VERIFICATION SUITE (Slice S04)
//
// Contract: financial mutations emit ActivityEvent with `action` starting with `finance.`
// and `metadata` is JSON parse-safe (no raw PII in these tests; only ids/cents/periodKey).
//
// IMPORTANT:
// - Do NOT use `mock.module`.
// - Use global seams: __TEST_SESSION__ / __TEST_PRISMA__.

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
  const candidates = ['activityEvent', 'financePayment', 'financeCharge', 'financeConcept', 'student', 'user', 'tenant'];
  for (const modelName of candidates) {
    const model = db?.[modelName];
    if (model?.deleteMany) {
      try {
        await model.deleteMany({});
      } catch {
        // ignore
      }
    }
  }
}

describe('M003 finance -> activity contracts (finance.* + parse-safe metadata)', () => {
  beforeEach(async () => {
    const db = getDb();
    await resetDb(db);
    clearTestSession();
  });

  it('generateForPeriod emits finance.charge.created with JSON metadata (repro: run generateForPeriod then read ActivityEvent)', async () => {
    const financeCharges = await import('../finance/charges');

    const db = getDb();
    const tenantA = await db.tenant.create({ data: { name: 'Tenant A', slug: 'tenant-a' } });

    const student = await db.student.create({ data: { tenantId: tenantA.id, firstName: 'A', lastName: 'One', status: 'active' } });
    const concept = await db.financeConcept.create({
      data: { tenantId: tenantA.id, name: 'Colegiatura', kind: 'monthly', amountCents: 100_00, currency: 'MXN' },
    });

    setTestSession({
      user: { id: 'user-admin-a', tenantId: tenantA.id, tenantSlug: tenantA.slug, role: 'admin', roles: ['admin'] },
    });
    await seedFinanceWriteAccess(tenantA.id, 'user-admin-a');

    const r = await financeCharges.generateForPeriod({ periodKey: '2026-03', conceptId: concept.id, studentIds: [student.id] });
    assert.equal(r.createdCount, 1);

    const events = await db.activityEvent.findMany({ where: { tenantId: tenantA.id, action: { startsWith: 'finance.' } } });
    assert.equal(events.length >= 1, true);

    const chargeCreated = events.find((e) => e.action === 'finance.charge.created');
    assert.ok(chargeCreated, 'activity contract broken: expected finance.charge.created event after generateForPeriod');

    assert.equal(typeof chargeCreated.metadata, 'string');

    let parsed: unknown;
    assert.doesNotThrow(() => {
      parsed = JSON.parse(chargeCreated.metadata);
    }, 'activity contract broken: ActivityEvent.metadata must be JSON.parse-safe (stringified JSON)');

    const p = parsed as { currency?: unknown; periodKey?: unknown; chargeId?: unknown; studentId?: unknown };
    assert.equal(p.currency, 'MXN');
    assert.equal(p.periodKey, '2026-03');
    assert.ok(p.chargeId);
    assert.equal(p.studentId, student.id);
  });

  it('recordManual emits finance.payment.recorded with JSON metadata (repro: recordManual then read ActivityEvent)', async () => {
    const financePayments = await import('../finance/payments');

    const db = getDb();
    const tenantA = await db.tenant.create({ data: { name: 'Tenant A', slug: 'tenant-a' } });

    const student = await db.student.create({ data: { tenantId: tenantA.id, firstName: 'A', lastName: 'One', status: 'active' } });
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
      user: { id: 'user-admin-a', tenantId: tenantA.id, tenantSlug: tenantA.slug, role: 'admin', roles: ['admin'] },
    });
    await seedFinanceWriteAccess(tenantA.id, 'user-admin-a');

    const created = await financePayments.recordManual({ chargeId: charge.id, amountCents: 25_00, paidAt: new Date('2026-03-05T12:00:00.000Z') });
    assert.ok(created?.id);

    const events = await db.activityEvent.findMany({ where: { tenantId: tenantA.id, action: { startsWith: 'finance.' } } });
    const paymentRecorded = events.find((e) => e.action === 'finance.payment.recorded');
    assert.ok(paymentRecorded, 'activity contract broken: expected finance.payment.recorded event after recordManual');

    let parsed: unknown;
    assert.doesNotThrow(() => {
      parsed = JSON.parse(paymentRecorded.metadata);
    }, 'activity contract broken: ActivityEvent.metadata must be JSON.parse-safe (stringified JSON)');

    const p = parsed as { amountCents?: unknown; currency?: unknown; chargeId?: unknown; paymentId?: unknown };
    assert.equal(p.amountCents, 25_00);
    assert.equal(p.currency, 'MXN');
    assert.equal(p.chargeId, charge.id);
    assert.ok(p.paymentId);
  });
});
