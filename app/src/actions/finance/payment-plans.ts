'use server';

import prisma from '@/lib/prisma';
import { getTenantIdFromSession, assertFinanceWriteAccess, ensureActorUserExists } from './_shared';
import { settleChargeStatus } from './payments';
import { STABLE_ERROR, stableError } from '@/lib/errors';

/**
 * Splits a single charge (e.g. a lump-sum "matrícula") into N installments.
 * This is separate from the existing recurring "monthly" charge generation
 * in enrollment-charges.ts, which already creates N independent charges for
 * tuition — a payment plan is for spreading ONE charge's amount over time.
 */
export async function createPaymentPlan(input: { chargeId: string; installmentCount: number; startDate: Date }) {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.tenantId, ctx.actorUserId);
  await ensureActorUserExists(ctx.actorUserId);

  if (!Number.isInteger(input.installmentCount) || input.installmentCount < 2) {
    throw stableError(STABLE_ERROR.FINANCE_PLAN_INVALID);
  }

  const charge = await prisma.financeCharge.findFirst({ where: { id: input.chargeId, tenantId: ctx.tenantId } });
  if (!charge) throw stableError(STABLE_ERROR.FINANCE_CHARGE_NOT_FOUND);
  if (charge.status === 'paid' || charge.status === 'void') throw stableError(STABLE_ERROR.FINANCE_PLAN_INVALID);

  const existing = await prisma.financePaymentPlan.findFirst({
    where: { chargeId: charge.id, tenantId: ctx.tenantId, status: 'active' },
  });
  if (existing) throw stableError(STABLE_ERROR.FINANCE_PLAN_ALREADY_EXISTS);

  const count = input.installmentCount;
  const baseCents = Math.floor(charge.amountCents / count);
  const remainder = charge.amountCents - baseCents * count;

  const plan = await prisma.$transaction(async (tx) => {
    const created = await tx.financePaymentPlan.create({
      data: {
        tenantId: ctx.tenantId,
        chargeId: charge.id,
        totalAmountCents: charge.amountCents,
        installmentCount: count,
        installmentsPaid: 0,
        startDate: input.startDate,
        nextDueDate: input.startDate,
        status: 'active',
      },
    });

    for (let i = 0; i < count; i++) {
      const dueDate = new Date(input.startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      // Last installment absorbs the rounding remainder.
      const amountCents = i === count - 1 ? baseCents + remainder : baseCents;

      await tx.financePaymentInstallment.create({
        data: {
          planId: created.id,
          tenantId: ctx.tenantId,
          number: i + 1,
          amountCents,
          dueDate,
          status: 'pending',
        },
      });
    }

    await tx.activityEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorUserId: ctx.actorUserId,
        entityType: 'finance',
        entityId: created.id,
        action: 'finance.plan.created',
        metadata: JSON.stringify({ planId: created.id, chargeId: charge.id, installmentCount: count }),
      },
    });

    return created;
  });

  return plan;
}

export async function getPaymentPlan(chargeId: string) {
  const ctx = await getTenantIdFromSession();

  const plan = await prisma.financePaymentPlan.findFirst({
    where: { chargeId, tenantId: ctx.tenantId },
    include: { installments: { orderBy: { number: 'asc' } } },
    orderBy: { createdAt: 'desc' },
  });

  return plan;
}

export async function listActivePlans() {
  const ctx = await getTenantIdFromSession();

  return prisma.financePaymentPlan.findMany({
    where: { tenantId: ctx.tenantId, status: 'active' },
    include: {
      installments: { orderBy: { number: 'asc' } },
      charge: { include: { student: { select: { firstName: true, lastName: true } }, concept: { select: { name: true } } } },
    },
    orderBy: { nextDueDate: 'asc' },
  });
}

export async function recordInstallmentPayment(input: {
  installmentId: string;
  paidAt: Date;
  method?: string;
  note?: string;
}) {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.tenantId, ctx.actorUserId);
  await ensureActorUserExists(ctx.actorUserId);

  const installment = await prisma.financePaymentInstallment.findFirst({
    where: { id: input.installmentId, tenantId: ctx.tenantId },
    include: { plan: { include: { charge: true } } },
  });
  if (!installment) throw stableError(STABLE_ERROR.FINANCE_PLAN_NOT_FOUND);
  if (installment.status === 'paid') throw stableError(STABLE_ERROR.FINANCE_PLAN_INVALID);

  const { plan } = installment;
  const method = (input.method ?? 'manual').trim() || 'manual';

  return prisma.$transaction(async (tx) => {
    const payment = await tx.financePayment.create({
      data: {
        tenantId: ctx.tenantId,
        studentId: plan.charge.studentId,
        chargeId: plan.chargeId,
        amountCents: installment.amountCents,
        currency: plan.charge.currency,
        paidAt: input.paidAt,
        method,
        note: input.note ?? `Cuota ${installment.number}/${plan.installmentCount}`,
        createdById: ctx.actorUserId,
      },
    });

    await tx.financePaymentInstallment.update({
      where: { id: installment.id },
      data: { status: 'paid', paidAt: input.paidAt, paymentId: payment.id },
    });

    const remaining = await tx.financePaymentInstallment.findMany({
      where: { planId: plan.id, status: { not: 'paid' } },
      orderBy: { dueDate: 'asc' },
      take: 1,
    });

    const installmentsPaid = plan.installmentsPaid + 1;
    await tx.financePaymentPlan.update({
      where: { id: plan.id },
      data: {
        installmentsPaid,
        nextDueDate: remaining[0]?.dueDate ?? null,
        status: remaining.length === 0 ? 'completed' : 'active',
      },
    });

    await settleChargeStatus(tx, ctx.tenantId, plan.chargeId, plan.charge.amountCents);

    await tx.activityEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorUserId: ctx.actorUserId,
        entityType: 'finance',
        entityId: installment.id,
        action: 'finance.plan.installment_paid',
        metadata: JSON.stringify({ planId: plan.id, installmentId: installment.id, amountCents: installment.amountCents }),
      },
    });

    return payment;
  });
}

export async function cancelPaymentPlan(planId: string) {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.tenantId, ctx.actorUserId);
  await ensureActorUserExists(ctx.actorUserId);

  const plan = await prisma.financePaymentPlan.findFirst({ where: { id: planId, tenantId: ctx.tenantId } });
  if (!plan) throw stableError(STABLE_ERROR.FINANCE_PLAN_NOT_FOUND);

  await prisma.$transaction(async (tx) => {
    await tx.financePaymentInstallment.updateMany({
      where: { planId, status: 'pending' },
      data: { status: 'cancelled' },
    });
    await tx.financePaymentPlan.update({ where: { id: planId }, data: { status: 'cancelled' } });
    await tx.activityEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorUserId: ctx.actorUserId,
        entityType: 'finance',
        entityId: planId,
        action: 'finance.plan.cancelled',
        metadata: JSON.stringify({ planId }),
      },
    });
  });
}
