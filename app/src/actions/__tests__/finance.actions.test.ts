import { before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

// NOTE: This is a *contract* test suite for Slice S01.
// It is expected to be RED until T02 implements schema + actions.
//
// Test seams used:
// - globalThis.__TEST_PRISMA__ (wired via '@/lib/prisma' + getTestPrisma)
// - globalThis.__TEST_SESSION__ (wired via '@/auth' auth() override)

type DB = typeof prisma;

function setTestSession(session: any) {
  (globalThis as any).__TEST_SESSION__ = session;
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

function getDb(): DB {
  // '@/lib/prisma' already respects __TEST_PRISMA__, but keep it explicit.
  return prisma as any;
}

async function resetDb(db: any) {
  // Best-effort cleanup. During T01, models might not exist yet.
  // Once T02 lands, this will work and keep tests isolated.
  const candidates = [
    'financeCharge',
    'financeConcept',
    'student',
    'tenant',
    // include user if needed later
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

describe('finance.s01 actions contract (S01)', { skip: false }, () => {
  let financeConcept: typeof import('../financeConcept');
  let financeCharge: typeof import('../financeCharge');

  before(async () => {
    // These imports are expected to fail until T02 provides the modules.
    financeConcept = await import('../financeConcept');
    financeCharge = await import('../financeCharge');
  });

  beforeEach(async () => {
    const db = getDb() as any;
    await resetDb(db);
    clearTestSession();
  });

  it('RBAC: non-admin/director cannot create concept (FINANCE_FORBIDDEN)', async () => {
    const db = getDb() as any;

    // Arrange minimal tenant context; T02 should implement tenant resolution by tenantSlug/tenantId.
    const tenantA = await db.tenant.create({ data: { name: 'Tenant A', slug: 'tenant-a' } });

    setTestSession({
      user: {
        id: 'user-teacher-a',
        tenantId: tenantA.id,
        tenantSlug: tenantA.slug,
        role: 'teacher',
        roles: ['teacher'],
      },
    });

    await assert.rejects(
      () =>
        (financeConcept as any).create({
          name: 'Colegiatura',
          kind: 'monthly',
          amountCents: 10000,
          currency: 'MXN',
        }),
      /FINANCE_FORBIDDEN/
    );
  });

  it('tenant-scope: cannot generate charges for concept from another tenant (FINANCE_CONCEPT_NOT_FOUND | FINANCE_SCOPE_VIOLATION)', async () => {
    const db = getDb() as any;

    const tenantA = await db.tenant.create({ data: { name: 'Tenant A', slug: 'tenant-a' } });
    const tenantB = await db.tenant.create({ data: { name: 'Tenant B', slug: 'tenant-b' } });

    // Students in tenant A (who would be charged)
    await db.student.create({ data: { firstName: 'Student', lastName: 'A1', tenantId: tenantA.id } });

    // Concept belongs to tenant B
    const conceptB = await db.financeConcept.create({
      data: {
        tenantId: tenantB.id,
        name: 'Colegiatura B',
        kind: 'monthly',
        amountCents: 10000,
        currency: 'MXN',
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

    await assert.rejects(
      () => (financeCharge as any).generateForPeriod({ conceptId: conceptB.id, periodKey: '2026-03' }),
      /(FINANCE_CONCEPT_NOT_FOUND|FINANCE_SCOPE_VIOLATION)/
    );
  });

  it('idempotency: generating same period twice does not create duplicates (createdCount/ skippedCount + unique (student, concept, periodKey))', async () => {
    const db = getDb() as any;

    const tenantA = await db.tenant.create({ data: { name: 'Tenant A', slug: 'tenant-a' } });

    const student1 = await db.student.create({ data: { firstName: 'Student', lastName: 'A1', tenantId: tenantA.id } });
    const student2 = await db.student.create({ data: { firstName: 'Student', lastName: 'A2', tenantId: tenantA.id } });

    const conceptA = await db.financeConcept.create({
      data: {
        tenantId: tenantA.id,
        name: 'Colegiatura',
        kind: 'monthly',
        amountCents: 10000,
        currency: 'MXN',
      },
    });

    setTestSession({
      user: {
        id: 'user-director-a',
        tenantId: tenantA.id,
        tenantSlug: tenantA.slug,
        role: 'director',
        roles: ['director'],
      },
    });

    const r1 = await (financeCharge as any).generateForPeriod({ conceptId: conceptA.id, periodKey: '2026-03' });
    assert.ok(r1.createdCount > 0, 'first run should create at least one charge');

    const r2 = await (financeCharge as any).generateForPeriod({ conceptId: conceptA.id, periodKey: '2026-03' });
    assert.equal(r2.createdCount, 0, 'second run should create 0 charges');
    assert.ok(r2.skippedCount >= 1, 'second run should report skippedCount >= 1');

    const charges = await db.financeCharge.findMany({
      where: { tenantId: tenantA.id, conceptId: conceptA.id, periodKey: '2026-03' },
    });

    // Expect exactly one charge per student for that concept+period.
    const studentIds = new Set(charges.map((c: any) => c.studentId));
    assert.equal(charges.length, 2);
    assert.equal(studentIds.has(student1.id), true);
    assert.equal(studentIds.has(student2.id), true);
  });
});
