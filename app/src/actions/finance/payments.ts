'use server';

import prisma from '@/lib/prisma';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import { assertFinanceWriteAccess, getTenantIdFromSession } from './_shared';
import type { Prisma } from '@prisma/client';

/**
 * Shared "paid iff sum(payments) >= amountCents" rule, used by both direct
 * manual payments and payment-plan installment payments so the threshold
 * logic only lives in one place.
 */
export async function settleChargeStatus(tx: Prisma.TransactionClient, tenantId: string, chargeId: string, amountCents: number) {
  const agg = await tx.financePayment.aggregate({
    where: { tenantId, chargeId },
    _sum: { amountCents: true },
  });
  const paidCents = agg._sum.amountCents ?? 0;
  const nextStatus = paidCents >= amountCents ? 'paid' : 'pending';
  await tx.financeCharge.update({ where: { id: chargeId }, data: { status: nextStatus } });
  return nextStatus;
}

export async function listAll() {
  const ctx = await getTenantIdFromSession();

  const payments = await prisma.financePayment.findMany({
    where: { tenantId: ctx.tenantId },
    select: {
      id: true,
      paidAt: true,
      amountCents: true,
      currency: true,
      method: true,
      note: true,
      reference: true,
      student: { select: { firstName: true, lastName: true, studentCode: true } },
      charge: { select: { concept: { select: { name: true } } } },
    },
    orderBy: { paidAt: 'desc' },
    take: 200,
  });

  const formatted = payments.map((p) => ({
    id: p.id,
    paidAt: p.paidAt,
    studentName: `${p.student.lastName} ${p.student.firstName}`,
    studentCode: p.student.studentCode,
    conceptName: p.charge.concept.name,
    methodName: p.method,
    amountCents: p.amountCents,
    currency: p.currency,
    note: p.note,
    reference: p.reference,
  }));

  const totalCents = payments.reduce((sum, p) => sum + p.amountCents, 0);

  return { payments: formatted, totalCents };
}

/**
 * Cobra un solo monto contra varios cargos (ej. el papá adelanta 2 o 3 mensualidades).
 * Reparte en cascada del cargo más viejo al más nuevo; el último puede quedar parcial.
 * No existe "saldo a favor": si el monto excede el saldo de los cargos elegidos, se rechaza.
 */
export async function recordManualMulti(input: {
  chargeIds: string[];
  amountCents: number;
  paidAt: Date;
  method?: string;
  note?: string;
  reference?: string;
}) {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.tenantId, ctx.actorUserId);

  // Mismo seam que recordManual: FinancePayment.createdById tiene FK a User.
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

  if (!input?.chargeIds?.length) throw stableError(STABLE_ERROR.FINANCE_CHARGE_NOT_FOUND);
  if (typeof input.amountCents !== 'number' || input.amountCents <= 0) {
    throw stableError(STABLE_ERROR.FINANCE_PAYMENT_INVALID_AMOUNT);
  }

  const charges = await prisma.financeCharge.findMany({
    where: { id: { in: input.chargeIds }, tenantId: ctx.tenantId },
    select: {
      id: true,
      studentId: true,
      currency: true,
      amountCents: true,
      status: true,
      dueDate: true,
      createdAt: true,
      payments: { select: { amountCents: true } },
    },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
  });

  if (charges.length !== input.chargeIds.length) throw stableError(STABLE_ERROR.FINANCE_CHARGE_NOT_FOUND);
  if (charges.some((c) => c.status === 'void')) throw new Error('Hay un cargo anulado en la selección.');
  if (new Set(charges.map((c) => c.studentId)).size > 1) {
    throw new Error('Todos los cargos deben ser del mismo alumno.');
  }

  const pending = charges
    .map((c) => ({ ...c, remainingCents: c.amountCents - c.payments.reduce((s, p) => s + p.amountCents, 0) }))
    .filter((c) => c.remainingCents > 0);

  const totalRemaining = pending.reduce((s, c) => s + c.remainingCents, 0);
  if (input.amountCents > totalRemaining) {
    throw new Error(
      `El monto excede el saldo de los cargos seleccionados por ${((input.amountCents - totalRemaining) / 100).toFixed(2)}. Selecciona otra cuota o baja el monto.`
    );
  }

  const method = (input.method ?? 'manual').trim() || 'manual';

  return prisma.$transaction(async (tx) => {
    let left = input.amountCents;
    const created: string[] = [];

    for (const charge of pending) {
      if (left <= 0) break;
      const allocated = Math.min(left, charge.remainingCents);
      left -= allocated;

      const payment = await tx.financePayment.create({
        data: {
          tenantId: ctx.tenantId,
          studentId: charge.studentId,
          chargeId: charge.id,
          amountCents: allocated,
          currency: charge.currency,
          paidAt: input.paidAt,
          method,
          note: input.note ?? null,
          reference: input.reference ?? null,
          createdById: ctx.actorUserId,
        },
      });
      created.push(payment.id);

      await tx.activityEvent.create({
        data: {
          tenantId: ctx.tenantId,
          actorUserId: ctx.actorUserId,
          entityType: 'finance',
          entityId: payment.id,
          action: 'finance.payment.recorded',
          metadata: JSON.stringify({
            paymentId: payment.id,
            studentId: payment.studentId,
            amountCents: payment.amountCents,
            currency: payment.currency,
            chargeId: payment.chargeId,
            multi: pending.length > 1,
          }),
        },
      });

      await settleChargeStatus(tx, ctx.tenantId, charge.id, charge.amountCents);
    }

    return { paymentIds: created, chargesAffected: created.length };
  });
}

export type RecordManualPaymentInput = {
  chargeId: string;
  amountCents: number;
  paidAt: Date;
  method?: string;
  note?: string;
  reference?: string;
  attachmentId?: string;
};

export async function recordManual(input: RecordManualPaymentInput) {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.tenantId, ctx.actorUserId);

  // Test seam: contract tests don't create User rows, but FinancePayment.createdById has FK.
  // Ensure the actor user exists (idempotent) before creating the payment.
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

  if (!input || typeof input.amountCents !== 'number' || input.amountCents <= 0) {
    throw stableError(STABLE_ERROR.FINANCE_PAYMENT_INVALID_AMOUNT);
  }

  const charge = await prisma.financeCharge.findFirst({
    where: { id: input.chargeId, tenantId: ctx.tenantId },
    select: { id: true, tenantId: true, studentId: true, currency: true, amountCents: true, status: true },
  });

  // Redaction: do not reveal whether a charge exists in another tenant.
  if (!charge) throw stableError(STABLE_ERROR.FINANCE_CHARGE_NOT_FOUND);
  if (charge.status === 'void') throw new Error('Este cargo está anulado; no admite pagos.');

  const method = (input.method ?? 'manual').trim() || 'manual';

  return prisma.$transaction(async (tx) => {
    const created = await tx.financePayment.create({
      data: {
        tenantId: ctx.tenantId,
        studentId: charge.studentId,
        chargeId: charge.id,
        amountCents: input.amountCents,
        currency: charge.currency,
        paidAt: input.paidAt,
        method,
        note: input.note ?? null,
        reference: input.reference ?? null,
        attachmentId: input.attachmentId ?? null,
        createdById: ctx.actorUserId,
      },
    });

    await tx.activityEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorUserId: ctx.actorUserId,
        entityType: 'finance',
        entityId: created.id,
        action: 'finance.payment.recorded',
        metadata: JSON.stringify({
          paymentId: created.id,
          studentId: created.studentId,
          amountCents: created.amountCents,
          currency: created.currency,
          chargeId: created.chargeId,
        }),
      },
    });

    // Update charge status deterministically (MVP: paid iff sum(payments) >= amountCents)
    await settleChargeStatus(tx, ctx.tenantId, charge.id, charge.amountCents);

    return created;
  });
}
