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

  return prisma.financeConcept.create({
    data: {
      tenantId: ctx.tenantId,
      name,
      kind: input.kind,
      amountCents: input.amountCents,
      currency: input.currency,
      isActive: true,
    },
  });
}

export async function list() {
  const ctx = await getTenantIdFromSession();

  return prisma.financeConcept.findMany({
    where: { tenantId: ctx.tenantId },
    orderBy: { createdAt: 'desc' },
  });
}
