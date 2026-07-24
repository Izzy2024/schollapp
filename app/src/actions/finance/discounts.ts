'use server';

import prisma from '@/lib/prisma';
import { getTenantIdFromSession, assertFinanceWriteAccess, ensureActorUserExists } from './_shared';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import type { PrismaClient } from '@prisma/client';

export type DiscountKind = 'sibling' | 'scholarship' | 'prompt_payment' | 'financial_aid' | 'custom';
export type DiscountAppliesTo = 'enrollment' | 'tuition' | 'all_charges' | 'specific_concept';

export type DiscountInput = {
  name: string;
  code?: string | null;
  kind: DiscountKind;
  percentage?: number | null;
  fixedCents?: number | null;
  appliesTo: DiscountAppliesTo;
  conceptIdFilter?: string | null;
  maxUses?: number | null;
  siblingMinCount?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
};

function assertValidRule(input: Pick<DiscountInput, 'percentage' | 'fixedCents' | 'appliesTo' | 'conceptIdFilter' | 'kind' | 'siblingMinCount'>) {
  const hasPercentage = typeof input.percentage === 'number' && input.percentage > 0;
  const hasFixed = typeof input.fixedCents === 'number' && input.fixedCents > 0;
  if (!hasPercentage && !hasFixed) throw stableError(STABLE_ERROR.FINANCE_DISCOUNT_INVALID_RULE);
  if (hasPercentage && hasFixed) throw stableError(STABLE_ERROR.FINANCE_DISCOUNT_INVALID_RULE);
  if (input.appliesTo === 'specific_concept' && !input.conceptIdFilter) throw stableError(STABLE_ERROR.FINANCE_DISCOUNT_INVALID_RULE);
  if (input.kind === 'sibling' && (!input.siblingMinCount || input.siblingMinCount < 1)) {
    throw stableError(STABLE_ERROR.FINANCE_DISCOUNT_INVALID_RULE);
  }
}

export async function create(input: DiscountInput) {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.user);
  await ensureActorUserExists(ctx.actorUserId);
  assertValidRule(input);

  const discount = await prisma.financeDiscount.create({
    data: {
      tenantId: ctx.tenantId,
      name: input.name.trim(),
      code: input.code?.trim() || null,
      kind: input.kind,
      percentage: input.percentage ?? null,
      fixedCents: input.fixedCents ?? null,
      appliesTo: input.appliesTo,
      conceptIdFilter: input.appliesTo === 'specific_concept' ? input.conceptIdFilter : null,
      maxUses: input.maxUses ?? null,
      siblingMinCount: input.kind === 'sibling' ? input.siblingMinCount : null,
      validFrom: input.validFrom ? new Date(input.validFrom) : null,
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
    },
  });

  await prisma.activityEvent.create({
    data: {
      tenantId: ctx.tenantId,
      actorUserId: ctx.actorUserId,
      entityType: 'finance',
      entityId: discount.id,
      action: 'finance.discount.created',
      metadata: JSON.stringify({ discountId: discount.id, kind: discount.kind, appliesTo: discount.appliesTo }),
    },
  });

  return discount;
}

export async function setActive(id: string, isActive: boolean) {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.user);

  const discount = await prisma.financeDiscount.findFirst({ where: { id, tenantId: ctx.tenantId } });
  if (!discount) throw stableError(STABLE_ERROR.FINANCE_DISCOUNT_NOT_FOUND);

  return prisma.financeDiscount.update({ where: { id }, data: { isActive } });
}

export async function list() {
  const ctx = await getTenantIdFromSession();
  return prisma.financeDiscount.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: 'desc' },
  });
}

async function getSiblingCount(
  client: Pick<PrismaClient, 'studentGuardian'>,
  tenantId: string,
  studentId: string
): Promise<number> {
  const links = await client.studentGuardian.findMany({
    where: { tenantId, studentId },
    select: { guardianId: true },
  });
  if (links.length === 0) return 0;

  const siblings = await client.studentGuardian.findMany({
    where: {
      tenantId,
      guardianId: { in: links.map((l) => l.guardianId) },
      studentId: { not: studentId },
    },
    select: { studentId: true },
    distinct: ['studentId'],
  });
  return siblings.length;
}

export type ResolvedDiscount = { discountId: string; name: string; reductionCents: number };

/**
 * Auto-resolution used only for the 'sibling' discount kind during automatic
 * enrollment charge generation — it's the only kind computable without a
 * per-student assignment (the schema has no student<->discount link table).
 * Other kinds (scholarship, prompt_payment, financial_aid, custom) are applied
 * manually to a specific charge via applyToCharge().
 */
export async function resolveSiblingDiscount(
  tx: Pick<PrismaClient, 'financeDiscount' | 'studentGuardian'>,
  tenantId: string,
  studentId: string,
  conceptId: string,
  chargeType: 'enrollment' | 'monthly' | string,
  baseAmountCents: number
): Promise<ResolvedDiscount | null> {
  const now = new Date();
  const appliesToValues: DiscountAppliesTo[] =
    chargeType === 'enrollment' ? ['enrollment', 'all_charges', 'specific_concept'] : ['tuition', 'all_charges', 'specific_concept'];

  const candidates = await tx.financeDiscount.findMany({
    where: {
      tenantId,
      isActive: true,
      kind: 'sibling',
      appliesTo: { in: appliesToValues },
      OR: [{ validFrom: null }, { validFrom: { lte: now } }],
    },
  });

  const siblingCount = await getSiblingCount(tx, tenantId, studentId);
  if (siblingCount === 0) return null;

  let best: ResolvedDiscount | null = null;
  for (const d of candidates) {
    if (d.appliesTo === 'specific_concept' && d.conceptIdFilter !== conceptId) continue;
    if (d.validUntil && d.validUntil < now) continue;
    if (d.maxUses != null && d.currentUses >= d.maxUses) continue;
    if (siblingCount < (d.siblingMinCount ?? 1)) continue;

    const reduction = d.percentage != null ? Math.round((baseAmountCents * d.percentage) / 100) : d.fixedCents ?? 0;
    if (reduction <= 0) continue;

    const capped = Math.min(reduction, baseAmountCents);
    if (!best || capped > best.reductionCents) best = { discountId: d.id, name: d.name, reductionCents: capped };
  }

  return best;
}

export async function markDiscountUsed(tx: Pick<PrismaClient, 'financeDiscount'>, discountId: string) {
  await tx.financeDiscount.update({ where: { id: discountId }, data: { currentUses: { increment: 1 } } });
}

/**
 * Manually apply a discount to an existing charge (scholarship, prompt payment, etc.).
 */
export async function applyToCharge(chargeId: string, discountId: string) {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.user);
  await ensureActorUserExists(ctx.actorUserId);

  const charge = await prisma.financeCharge.findFirst({ where: { id: chargeId, tenantId: ctx.tenantId } });
  if (!charge) throw stableError(STABLE_ERROR.FINANCE_CHARGE_NOT_FOUND);
  if (charge.status === 'void') throw new Error('Este cargo está anulado; no admite descuentos.');

  const discount = await prisma.financeDiscount.findFirst({ where: { id: discountId, tenantId: ctx.tenantId, isActive: true } });
  if (!discount) throw stableError(STABLE_ERROR.FINANCE_DISCOUNT_NOT_FOUND);
  if (discount.maxUses != null && discount.currentUses >= discount.maxUses) throw stableError(STABLE_ERROR.FINANCE_DISCOUNT_INVALID_RULE);
  if (discount.appliesTo === 'specific_concept' && discount.conceptIdFilter !== charge.conceptId) {
    throw stableError(STABLE_ERROR.FINANCE_DISCOUNT_INVALID_RULE);
  }

  const reduction = discount.percentage != null ? Math.round((charge.amountCents * discount.percentage) / 100) : discount.fixedCents ?? 0;
  const capped = Math.min(reduction, charge.amountCents);
  if (capped <= 0) throw stableError(STABLE_ERROR.FINANCE_DISCOUNT_INVALID_RULE);

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.financeCharge.update({
      where: { id: chargeId },
      data: { amountCents: charge.amountCents - capped },
    });
    await markDiscountUsed(tx, discountId);
    await tx.activityEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorUserId: ctx.actorUserId,
        entityType: 'finance',
        entityId: chargeId,
        action: 'finance.discount.applied',
        metadata: JSON.stringify({ chargeId, discountId, reductionCents: capped }),
      },
    });
    return result;
  });

  return updated;
}
