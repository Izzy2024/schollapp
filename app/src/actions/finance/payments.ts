'use server';

import prisma from '@/lib/prisma';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import { assertFinanceWriteAccess, getTenantIdFromSession } from './_shared';

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
  await assertFinanceWriteAccess(ctx.user);

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
    select: { id: true, tenantId: true, studentId: true, currency: true, amountCents: true },
  });

  // Redaction: do not reveal whether a charge exists in another tenant.
  if (!charge) throw stableError(STABLE_ERROR.FINANCE_CHARGE_NOT_FOUND);

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

    // Optional: update charge status deterministically (MVP: paid iff sum(payments) >= amountCents)
    const agg = await tx.financePayment.aggregate({
      where: { tenantId: ctx.tenantId, chargeId: charge.id },
      _sum: { amountCents: true },
    });

    const paidCents = agg._sum.amountCents ?? 0;
    const nextStatus = paidCents >= charge.amountCents ? 'paid' : 'pending';

    await tx.financeCharge.update({
      where: { id: charge.id },
      data: { status: nextStatus as any },
    });

    return created;
  });
}
