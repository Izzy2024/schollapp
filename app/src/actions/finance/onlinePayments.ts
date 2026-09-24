'use server';

import prisma from '@/lib/prisma';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import { getTenantIdFromSession } from './_shared';
import { settleChargeStatus } from './payments';
import { getPaymentGateway } from '@/lib/payment';

/** A stable per-tenant "system" actor for payments recorded automatically via webhook (no human session). */
async function getSystemUserId(tenantId: string, tenantSlug: string): Promise<string> {
  const email = `system-payments+${tenantSlug}@internal.local`;
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, fullName: 'Sistema de Pagos', passwordHash: 'system', isActive: false },
  });
  await prisma.userMembership.upsert({
    where: { tenantId_userId: { tenantId, userId: user.id } },
    update: {},
    create: { tenantId, userId: user.id, status: 'active' },
  });
  return user.id;
}

export async function createCheckoutSessionForCharge(chargeId: string): Promise<{ url: string } | { error: string }> {
  const ctx = await getTenantIdFromSession();

  const role = ctx.user.role ?? undefined;
  const roles = ctx.user.roles ?? [];
  if (role !== 'parent' && !roles.includes('parent')) throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);

  const email = ctx.user.email as string | undefined;
  const guardian = email ? await prisma.guardian.findFirst({ where: { tenantId: ctx.tenantId, email } }) : null;
  if (!guardian) throw stableError(STABLE_ERROR.INVALID_TARGET);

  const charge = await prisma.financeCharge.findFirst({
    where: { tenantId: ctx.tenantId, id: chargeId },
    include: { concept: true, student: true, payments: true },
  });
  if (!charge) return { error: STABLE_ERROR.FINANCE_CHARGE_NOT_FOUND };

  const link = await prisma.studentGuardian.findUnique({
    where: { tenantId_studentId_guardianId: { tenantId: ctx.tenantId, studentId: charge.studentId, guardianId: guardian.id } },
  });
  if (!link) throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);

  if (charge.status === 'paid' || charge.status === 'void') return { error: STABLE_ERROR.CHARGE_NOT_PAYABLE };

  const paidSoFar = charge.payments.reduce((sum, p) => sum + p.amountCents, 0);
  const remainingCents = charge.amountCents - paidSoFar;
  if (remainingCents <= 0) return { error: STABLE_ERROR.CHARGE_NOT_PAYABLE };

  const gateway = await getPaymentGateway();
  if (!gateway) return { error: STABLE_ERROR.PAYMENT_GATEWAY_NOT_CONFIGURED };

  const appUrl = process.env.APP_URL ?? '';
  const { url } = await gateway.createCheckoutSession({
    amountCents: remainingCents,
    currency: charge.currency,
    description: `${charge.concept.name} — ${charge.student.firstName} ${charge.student.lastName}`,
    successUrl: `${appUrl}/parent/finances?paid=1`,
    cancelUrl: `${appUrl}/parent/finances?paid=0`,
    metadata: { tenantId: ctx.tenantId, chargeId: charge.id, studentId: charge.studentId },
  });

  return { url };
}

/** Called by the webhook route after verifying the gateway signature. Idempotent by external reference. */
export async function recordOnlinePaymentFromWebhook(event: {
  metadata: Record<string, string>;
  amountCents: number;
  currency: string;
  externalReference: string;
}): Promise<{ success: true } | { error: string }> {
  const { tenantId, chargeId, studentId } = event.metadata;
  if (!tenantId || !chargeId || !studentId) return { error: STABLE_ERROR.INVALID_TARGET };

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return { error: STABLE_ERROR.INVALID_TARGET };

  const existing = await prisma.financePayment.findFirst({ where: { tenantId, reference: event.externalReference } });
  if (existing) return { success: true }; // already recorded, webhook retried

  const charge = await prisma.financeCharge.findFirst({ where: { id: chargeId, tenantId } });
  if (!charge) return { error: STABLE_ERROR.FINANCE_CHARGE_NOT_FOUND };

  const systemUserId = await getSystemUserId(tenantId, tenant.slug);

  await prisma.$transaction(async (tx) => {
    await tx.financePayment.create({
      data: {
        tenantId,
        studentId,
        chargeId,
        amountCents: event.amountCents,
        currency: event.currency,
        paidAt: new Date(),
        method: 'online',
        reference: event.externalReference,
        createdById: systemUserId,
      },
    });
    await settleChargeStatus(tx, tenantId, chargeId, charge.amountCents);
  });

  return { success: true };
}
