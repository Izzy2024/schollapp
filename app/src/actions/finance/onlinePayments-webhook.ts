import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { STABLE_ERROR } from '@/lib/errors';
import { settleChargeStatus } from './payments';

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

/**
 * Called by the webhook route after verifying the gateway signature.
 *
 * Intentionally NOT in a `'use server'` file: it has no human session and must
 * never be reachable as a client-invocable server action by its ID.
 *
 * Idempotent by external reference (enforced by @@unique([tenantId, reference])
 * plus a P2002 catch for concurrent retries).
 */
export async function recordOnlinePaymentFromWebhook(event: {
  metadata: Record<string, string>;
  amountCents: number;
  currency: string;
  externalReference: string;
  paymentStatus: string;
}): Promise<{ success: true } | { error: string }> {
  const { tenantId, chargeId, studentId } = event.metadata;
  if (!tenantId || !chargeId || !studentId) return { error: STABLE_ERROR.INVALID_TARGET };

  // Deferred methods (e.g. OXXO) can complete the checkout before the money
  // settles. Not an error: wait for Stripe's definitive event.
  if (event.paymentStatus !== 'paid') return { success: true };

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return { error: STABLE_ERROR.INVALID_TARGET };

  const existing = await prisma.financePayment.findFirst({ where: { tenantId, reference: event.externalReference } });
  if (existing) return { success: true }; // already recorded, webhook retried

  const charge = await prisma.financeCharge.findFirst({ where: { id: chargeId, tenantId } });
  if (!charge) return { error: STABLE_ERROR.FINANCE_CHARGE_NOT_FOUND };

  if (charge.status === 'void' || charge.status === 'paid') {
    return { error: STABLE_ERROR.CHARGE_NOT_PAYABLE };
  }

  const systemUserId = await getSystemUserId(tenantId, tenant.slug);

  try {
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
  } catch (error) {
    // A concurrent delivery of the same event won the unique constraint race.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: true };
    }
    throw error;
  }

  return { success: true };
}
