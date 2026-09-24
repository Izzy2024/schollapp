'use server';

import prisma from '@/lib/prisma';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import { getTenantIdFromSession } from './_shared';
import { getPaymentGateway } from '@/lib/payment';

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
