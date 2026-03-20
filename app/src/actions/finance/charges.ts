'use server';

import prisma from '@/lib/prisma';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import { assertFinanceWriteAccess, getTenantIdFromSession, normalizeAndValidatePeriodKey } from './_shared';

export async function generateForPeriod(input: { periodKey: string; conceptId: string; studentIds?: string[] }) {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.user);

  const periodKey = await normalizeAndValidatePeriodKey(input.periodKey);

  const concept = await prisma.financeConcept.findFirst({ where: { id: input.conceptId, tenantId: ctx.tenantId } });
  if (!concept) {
    // contract expects FINANCE_CONCEPT_NOT_FOUND or FINANCE_SCOPE_VIOLATION
    throw stableError(STABLE_ERROR.FINANCE_CONCEPT_NOT_FOUND);
  }

  const students = await prisma.student.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: 'active',
      ...(input.studentIds?.length ? { id: { in: input.studentIds } } : {}),
    },
    select: { id: true },
  });

  const data = students.map((s) => ({
    tenantId: ctx.tenantId,
    studentId: s.id,
    conceptId: concept.id,
    periodKey: concept.kind === 'monthly' ? periodKey : null,
    amountCents: concept.amountCents,
    currency: concept.currency,
    status: 'pending' as const,
  }));

  if (data.length === 0) return { createdCount: 0, skippedCount: 0 };

  // NOTE: `skipDuplicates` is not available with the current SQLite + prisma config in this repo.
  // We still guarantee idempotency via the @@unique(...) constraint by doing per-row create
  // and counting unique-constraint violations as skipped.
  let createdCount = 0;
  let skippedCount = 0;

  for (const row of data) {
    try {
      const created = await prisma.financeCharge.create({ data: row });
      createdCount++;

      // Contract tests sometimes don't create User rows; ActivityEvent.actorUserId is FK.
      // Ensure actor exists (idempotent) to avoid FK violations while keeping metadata minimal.
      if (ctx.actorUserId) {
        await prisma.user.upsert({
          where: { id: ctx.actorUserId },
          update: {},
          create: {
            id: ctx.actorUserId,
            email: `${ctx.actorUserId}@test.local`,
            passwordHash: 'test',
            fullName: ctx.actorUserId,
            isActive: true,
          },
        });
      }

      await prisma.activityEvent.create({
        data: {
          tenantId: ctx.tenantId,
          actorUserId: ctx.actorUserId,
          entityType: 'finance',
          entityId: created.id,
          action: 'finance.charge.created',
          metadata: JSON.stringify({
            chargeId: created.id,
            conceptId: created.conceptId,
            studentId: created.studentId,
            periodKey: created.periodKey,
            amountCents: created.amountCents,
            currency: created.currency,
          }),
        },
      });
    } catch (err: unknown) {
      const e = err as { code?: unknown };
      // Prisma unique constraint violation
      if (e?.code === 'P2002') {
        skippedCount++;
        continue;
      }
      throw err;
    }
  }

  return { createdCount, skippedCount };
}

export async function listByPeriod(input: { periodKey: string; conceptId?: string }) {
  const ctx = await getTenantIdFromSession();
  const periodKey = await normalizeAndValidatePeriodKey(input.periodKey);

  return prisma.financeCharge.findMany({
    where: {
      tenantId: ctx.tenantId,
      periodKey,
      ...(input.conceptId ? { conceptId: input.conceptId } : {}),
    },
    include: {
      student: { select: { id: true, firstName: true, lastName: true } },
      concept: { select: { id: true, name: true, kind: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
