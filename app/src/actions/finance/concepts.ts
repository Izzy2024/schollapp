'use server';

import prisma from '@/lib/prisma';
import { getTenantIdFromSession, assertFinanceWriteAccess } from './_shared';

export type FinanceConceptKind = 'monthly' | 'one_time';

export async function create(input: {
  name: string;
  kind: FinanceConceptKind;
  amountCents: number;
  currency: string;
}) {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.user);

  const name = input.name?.trim();
  if (!name) throw new Error('Invalid name');

  return prisma.$transaction(async (tx) => {
    const concept = await tx.financeConcept.create({
      data: {
        tenantId: ctx.tenantId,
        name,
        kind: input.kind,
        amountCents: input.amountCents,
        currency: input.currency,
        isActive: true,
      },
    });

    await tx.activityEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorUserId: ctx.actorUserId,
        entityType: 'finance',
        entityId: concept.id,
        action: 'finance.concept.created',
        metadata: JSON.stringify({
          conceptId: concept.id,
          amountCents: concept.amountCents,
          currency: concept.currency,
          cadence: concept.kind,
        }),
      },
    });

    return concept;
  });
}

export async function update(input: {
  id: string;
  kind?: FinanceConceptKind;
  amountCents?: number;
  currency?: string;
  isActive?: boolean;
}) {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.user);

  const concept = await prisma.financeConcept.findFirst({ where: { id: input.id, tenantId: ctx.tenantId } });
  if (!concept) throw new Error('Concept not found');

  const next = await prisma.$transaction(async (tx) => {
    const updated = await tx.financeConcept.update({
      where: { id: concept.id },
      data: {
        kind: input.kind ?? undefined,
        amountCents: typeof input.amountCents === 'number' ? input.amountCents : undefined,
        currency: input.currency ?? undefined,
        isActive: typeof input.isActive === 'boolean' ? input.isActive : undefined,
      },
    });

    await tx.activityEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorUserId: ctx.actorUserId,
        entityType: 'finance',
        entityId: updated.id,
        action: 'finance.concept.updated',
        metadata: JSON.stringify({
          conceptId: updated.id,
          amountCents: updated.amountCents,
          currency: updated.currency,
          cadence: updated.kind,
        }),
      },
    });

    return updated;
  });

  return next;
}

export async function list() {
  const ctx = await getTenantIdFromSession();

  return prisma.financeConcept.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: 'desc' },
  });
}
