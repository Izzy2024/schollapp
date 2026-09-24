import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';
import { STABLE_ERROR } from '@/lib/errors';

// Failure visibility contract (Slice S05)
// Goal: At least one deterministic finance failure MUST propagate a stable error code
// (STABLE_ERROR.*) to the caller (server action), preventing regressions to UNKNOWN_ERROR.
//
// Conventions:
// - DO NOT use `node:test` mock.module.
// - Use the global seams wired by the repo: globalThis.__TEST_SESSION__.

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
  const candidates = ['activityEvent', 'financePayment', 'financeCharge', 'financeConcept', 'student', 'user', 'tenant'];

  for (const modelName of candidates) {
    const model = (db as any)?.[modelName];
    if (model?.deleteMany) {
      try {
        await model.deleteMany({});
      } catch {
        // ignore
      }
    }
  }
}

describe('S05 failure visibility contract (finance server actions)', () => {
  beforeEach(async () => {
    await resetDb(getDb());
    clearTestSession();
  });

  it('RBAC deterministic failure: parent calling finance mutation returns STABLE_ERROR.FINANCE_FORBIDDEN (not UNKNOWN_ERROR)', async () => {
    const financeCharges = await import('../charges');

    const db = getDb();
    const tenantA = await db.tenant.create({ data: { name: 'Tenant A', slug: 'tenant-a' } });

    // Seed minimal concept (the call should fail on RBAC before concept existence matters,
    // but we keep this setup stable in case ordering changes).
    const concept = await db.financeConcept.create({
      data: { tenantId: tenantA.id, name: 'Colegiatura', kind: 'monthly', amountCents: 100_00, currency: 'MXN', isActive: true },
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

    let thrown: unknown;
    try {
      await financeCharges.generateForPeriod({ periodKey: '2026-03', conceptId: concept.id });
    } catch (e) {
      thrown = e;
    }

    assert.ok(thrown, 'expected server action to throw');

    // Contract: must propagate a stable code all the way out.
    // Current StableError implementation uses Error.message as the stable code.
    const err = thrown as { message?: unknown; code?: unknown };
    const code = (typeof err.code === 'string' && err.code) || (typeof err.message === 'string' && err.message) || '';

    assert.equal(
      code,
      STABLE_ERROR.FINANCE_FORBIDDEN,
      `failure visibility contract broken: expected stable code ${STABLE_ERROR.FINANCE_FORBIDDEN}, got ${String(code)}`
    );

    assert.notEqual(
      code,
      'UNKNOWN_ERROR',
      `failure visibility contract broken: got UNKNOWN_ERROR instead of a stable finance code (${STABLE_ERROR.FINANCE_FORBIDDEN})`
    );
  });
});
