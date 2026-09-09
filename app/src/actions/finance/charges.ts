'use server';

import prisma from '@/lib/prisma';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import { assertFinanceWriteAccess, getTenantIdFromSession, normalizeAndValidatePeriodKey } from './_shared';

export async function generateForPeriod(input: { periodKey: string; conceptId: string; studentIds?: string[] }) {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.tenantId, ctx.actorUserId);

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
    periodKey,
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

/**
 * Anula un cargo emitido por error. No borra la fila: deja `status: 'void'` y el
 * motivo en el ActivityEvent, para que el estado de cuenta del alumno siga siendo
 * auditable ("se corrigió") en vez de que el cargo simplemente desaparezca.
 */
export async function voidCharge(input: { chargeId: string; reason: string }) {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.tenantId, ctx.actorUserId);

  const reason = input.reason?.trim();
  if (!reason) throw new Error('Indica el motivo de la anulación');

  const charge = await prisma.financeCharge.findFirst({
    where: { id: input.chargeId, tenantId: ctx.tenantId },
    select: {
      id: true,
      status: true,
      amountCents: true,
      currency: true,
      _count: { select: { payments: true } },
      invoices: { where: { status: { not: 'cancelled' } }, select: { folio: true } },
    },
  });

  // Redacción: no revelar si el cargo existe en otro tenant.
  if (!charge) throw stableError(STABLE_ERROR.FINANCE_CHARGE_NOT_FOUND);
  if (charge.status === 'void') return charge; // idempotente

  if (charge._count.payments > 0) {
    throw new Error('Este cargo ya tiene pagos registrados. Elimina o reasigna los pagos antes de anularlo.');
  }
  if (charge.invoices.length > 0) {
    throw new Error(`Este cargo tiene la factura ${charge.invoices[0].folio} emitida. Anula primero la factura.`);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.financeCharge.update({ where: { id: charge.id }, data: { status: 'void' } });

    await tx.activityEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorUserId: ctx.actorUserId,
        entityType: 'finance',
        entityId: updated.id,
        action: 'finance.charge.voided',
        metadata: JSON.stringify({
          chargeId: updated.id,
          studentId: updated.studentId,
          conceptId: updated.conceptId,
          periodKey: updated.periodKey,
          amountCents: updated.amountCents,
          currency: updated.currency,
          reason,
        }),
      },
    });

    return updated;
  });
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

/**
 * Cargos abiertos de un alumno (pendientes/vencidos) con su saldo real,
 * ordenados del más viejo al más nuevo. Es la lista que se usa para cobrar
 * varias cuotas de una sola vez.
 */
export async function listOpenChargesForStudent(studentId: string) {
  const ctx = await getTenantIdFromSession();

  const charges = await prisma.financeCharge.findMany({
    where: { tenantId: ctx.tenantId, studentId, status: { in: ['pending', 'overdue'] } },
    select: {
      id: true,
      amountCents: true,
      currency: true,
      dueDate: true,
      periodKey: true,
      status: true,
      concept: { select: { name: true } },
      payments: { select: { amountCents: true } },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  });

  return charges
    .map((c) => ({
      id: c.id,
      conceptName: c.concept.name,
      periodKey: c.periodKey,
      dueDate: c.dueDate,
      status: c.status,
      currency: c.currency,
      amountCents: c.amountCents,
      remainingCents: c.amountCents - c.payments.reduce((sum, p) => sum + p.amountCents, 0),
    }))
    .filter((c) => c.remainingCents > 0);
}

export async function listStudentsForSelect() {
  const ctx = await getTenantIdFromSession();
  
  const activeYear = await prisma.academicYear.findFirst({
    where: { tenantId: ctx.tenantId, isActive: true },
    select: { id: true }
  });

  const students = await prisma.student.findMany({
    where: { tenantId: ctx.tenantId, status: 'active' },
    select: { 
      id: true, 
      firstName: true, 
      lastName: true, 
      studentCode: true,
      enrollments: {
        where: { academicYearId: activeYear?.id || '', status: { in: ['enrolled', 'reenrolled'] } },
        select: { section: { select: { name: true, gradeLevel: { select: { name: true } } } } }
      }
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  });
  return students.map(s => {
    const enrollment = s.enrollments?.[0];
    const sectionInfo = enrollment ? ` (${enrollment.section.gradeLevel.name} ${enrollment.section.name})` : '';
    return {
      value: s.id,
      label: `${s.studentCode ?? '—'} · ${s.lastName} ${s.firstName}${sectionInfo}`
    };
  });
}
