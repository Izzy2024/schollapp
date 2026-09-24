import { before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

// Contract tests for Slice S03 (financial observability):
// - Finance mutations must emit ActivityEvent rows (entityType: 'finance')
// - Activity Feed must be able to filter to only finance events via getRecentActivities(..., 'finance', ...)
//
// IMPORTANT: These tests are expected to be RED when first introduced.
// They define the completion criteria for S03.

type DB = typeof prisma;

function setTestSession(session: any) {
  (globalThis as any).__TEST_SESSION__ = session;
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

function setTestPrisma(db: any) {
  (globalThis as any).__TEST_PRISMA__ = db;
}

function clearTestPrisma() {
  delete (globalThis as any).__TEST_PRISMA__;
}

function getDb(): DB {
  return prisma as any;
}

async function resetDb(db: any) {
  // Best-effort cleanup (keep resilient while schema evolves)
  const candidates = [
    'activityEvent',
    'financePayment',
    'financeCharge',
    'financeConcept',
    'student',
    'tenantMembership',
    'userRole',
    'role',
    'user',
    'tenant',
  ];

  for (const modelName of candidates) {
    const model = db?.[modelName];
    if (model?.deleteMany) {
      try {
        await model.deleteMany({});
      } catch {
        // ignore until schema supports it
      }
    }
  }
}

describe('finance activity events + feed filter contract (S03)', () => {
  let financeCharge: typeof import('@/actions/finance/charges');
  let financePayment: typeof import('@/actions/finance/payments');
  let getRecentActivities: typeof import('@/actions/activity').getRecentActivities;

  before(async () => {
    financeCharge = await import('@/actions/finance/charges');
    financePayment = await import('@/actions/finance/payments');
    ({ getRecentActivities } = await import('@/actions/activity'));
  });

  beforeEach(async () => {
    const db = getDb() as any;
    setTestPrisma(db);
    await resetDb(db);
    clearTestSession();
  });

  it('emits ActivityEvent rows for charge generation + payment recording, and feed filter returns only finance events', async () => {
    const db = getDb() as any;

    // Seed minimal tenant + actors + student + finance concept
    const tenant = await db.tenant.create({ data: { name: 'Tenant Finance', slug: 'tenant-fin' } });

    const adminUser = await db.user.create({
      data: {
        id: 'user-admin-fin',
        email: 'admin-fin@test.local',
        passwordHash: 'test',
        fullName: 'Admin Finance',
        isActive: true,
      },
    });

    // Some repos require memberships/roles; keep best-effort and non-fatal
    try {
      if (db.tenantMembership?.create) {
        await db.tenantMembership.create({
          data: { tenantId: tenant.id, userId: adminUser.id },
        });
      }
    } catch {
      // ignore if membership model differs
    }

    await db.user.create({
      data: {
        id: 'user-parent-fin',
        email: 'parent-fin@test.local',
        passwordHash: 'test',
        fullName: 'Parent Finance',
        isActive: true,
      },
    });

    const student = await db.student.create({
      data: {
        tenantId: tenant.id,
        firstName: 'Student',
        lastName: 'Finance',
        status: 'active',
      },
    });

    const concept = await db.financeConcept.create({
      data: {
        tenantId: tenant.id,
        name: 'Colegiatura',
        kind: 'monthly',
        amountCents: 10000,
        currency: 'MXN',
      },
    });

    // Run finance actions as admin/director
    setTestSession({
      user: {
        id: adminUser.id,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        role: 'admin',
        roles: ['admin'],
      },
    });

    const gen1 = await financeCharge.generateForPeriod({
      periodKey: '2026-03',
      conceptId: concept.id,
      studentIds: [student.id],
    });
    assert.ok(gen1.createdCount >= 1, 'should create at least 1 charge');

    const charge = await db.financeCharge.findFirst({
      where: { tenantId: tenant.id, conceptId: concept.id, studentId: student.id, periodKey: '2026-03' },
      orderBy: { createdAt: 'desc' },
    });
    assert.ok(charge, 'expected a created charge');

    await financePayment.recordManual({
      chargeId: charge.id,
      amountCents: 5000,
      paidAt: new Date('2026-03-20T12:00:00.000Z'),
      method: 'cash',
      note: 'partial payment',
    });

    // Persistence contract: finance actions must emit ActivityEvent rows.
    const events = await db.activityEvent.findMany({
      where: { tenantId: tenant.id, entityType: 'finance' },
      orderBy: { occurredAt: 'asc' },
    });

    // Expected actions for S03
    const actions = events.map((e: any) => e.action);
    assert.ok(actions.includes('finance.charge.created'), 'missing finance.charge.created ActivityEvent');
    assert.ok(actions.includes('finance.payment.recorded'), 'missing finance.payment.recorded ActivityEvent');

    // Metadata contract: must be parse-safe, no PII, contain stable ids + cents + periodKey
    const chargeEvt = events.find((e: any) => e.action === 'finance.charge.created');
    assert.ok(chargeEvt, 'expected a finance.charge.created event');
    assert.equal(chargeEvt.entityId != null, true);
    assert.equal(typeof chargeEvt.metadata, 'string');
    assert.ok(chargeEvt.metadata.includes(charge.id) || chargeEvt.metadata.includes(concept.id));

    const payEvt = events.find((e: any) => e.action === 'finance.payment.recorded');
    assert.ok(payEvt, 'expected a finance.payment.recorded event');
    assert.equal(typeof payEvt.metadata, 'string');
    assert.ok(payEvt.metadata.includes(charge.id));

    // Feed contract: taxonomy & filter must support finance
    const feed = await getRecentActivities(undefined, 'finance', 1, 50);
    assert.ok(feed.activities.length >= 2, 'expected at least 2 activities in finance feed');
    assert.equal(
      feed.activities.every((a: any) => a.entityType === 'finance'),
      true,
      'finance feed should only include entityType === finance'
    );

    // Ensure finance events appear in feed list
    const feedActions = feed.activities.map((a: any) => a.action);
    assert.ok(feedActions.includes('finance.charge.created'));
    assert.ok(feedActions.includes('finance.payment.recorded'));
  });

  it('idempotency: re-running charge generation does NOT create duplicate finance.charge.created events for the same charge', async () => {
    const db = getDb() as any;

    const tenant = await db.tenant.create({ data: { name: 'Tenant Finance 2', slug: 'tenant-fin-2' } });
    const adminUser = await db.user.create({
      data: {
        id: 'user-admin-fin-2',
        email: 'admin-fin-2@test.local',
        passwordHash: 'test',
        fullName: 'Admin Finance 2',
        isActive: true,
      },
    });
    const student = await db.student.create({
      data: {
        tenantId: tenant.id,
        firstName: 'Student',
        lastName: 'Two',
        status: 'active',
      },
    });
    const concept = await db.financeConcept.create({
      data: {
        tenantId: tenant.id,
        name: 'Colegiatura',
        kind: 'monthly',
        amountCents: 10000,
        currency: 'MXN',
      },
    });

    setTestSession({
      user: {
        id: adminUser.id,
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        role: 'admin',
        roles: ['admin'],
      },
    });

    await financeCharge.generateForPeriod({
      periodKey: '2026-03',
      conceptId: concept.id,
      studentIds: [student.id],
    });
    await financeCharge.generateForPeriod({
      periodKey: '2026-03',
      conceptId: concept.id,
      studentIds: [student.id],
    });

    const charge = await db.financeCharge.findFirst({
      where: { tenantId: tenant.id, conceptId: concept.id, studentId: student.id, periodKey: '2026-03' },
    });
    assert.ok(charge);

    const eventsForCharge = await db.activityEvent.findMany({
      where: {
        tenantId: tenant.id,
        entityType: 'finance',
        action: 'finance.charge.created',
        entityId: charge.id,
      },
    });

    // Contract: exactly one event per created charge (no duplicates on idempotent regeneration)
    assert.equal(eventsForCharge.length, 1);
  });

  process.on('exit', () => {
    clearTestSession();
    clearTestPrisma();
  });
});
