'use server';

import prisma from '@/lib/prisma';
import { getTenantIdFromSession, assertFinanceWriteAccess } from './_shared';
import { Prisma } from '@prisma/client';

export type FinanceConceptKind = 'monthly' | 'one_time';

export async function create(input: {
  name: string;
  kind: FinanceConceptKind;
  amountCents: number;
  currency: string;
  autoGenerateOnEnrollment?: boolean;
  chargeType?: string | null;
  installmentCount?: number | null;
  applySiblingDiscount?: boolean;
  gradeLevelId?: string | null;
}) {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.tenantId, ctx.actorUserId);

  const name = input.name?.trim();
  if (!name) throw new Error('El nombre es requerido');

  try {
    return await prisma.$transaction(async (tx) => {
      const concept = await tx.financeConcept.create({
        data: {
          tenantId: ctx.tenantId,
          name,
          kind: input.kind,
          amountCents: input.amountCents,
          currency: input.currency,
          isActive: true,
          autoGenerateOnEnrollment: input.autoGenerateOnEnrollment || false,
          chargeType: input.chargeType || null,
          installmentCount: input.installmentCount || null,
          applySiblingDiscount: input.applySiblingDiscount || false,
          gradeLevelId: input.gradeLevelId || null,
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
            autoGenerate: concept.autoGenerateOnEnrollment,
            chargeType: concept.chargeType,
            gradeLevelId: concept.gradeLevelId,
          }),
        },
      });

      return concept;
    });
  } catch (err) {
    // Handle unique constraint violation
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new Error(`Ya existe un concepto llamado "${name}". Usa otro nombre o edita el existente.`);
    }
    throw err;
  }
}

export async function update(input: {
  id: string;
  name?: string;
  kind?: FinanceConceptKind;
  amountCents?: number;
  currency?: string;
  isActive?: boolean;
  autoGenerateOnEnrollment?: boolean;
  chargeType?: string | null;
  installmentCount?: number | null;
  applySiblingDiscount?: boolean;
  gradeLevelId?: string | null;
}) {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.tenantId, ctx.actorUserId);

  const concept = await prisma.financeConcept.findFirst({ where: { id: input.id, tenantId: ctx.tenantId } });
  if (!concept) throw new Error('Concepto no encontrado');

  const name = input.name?.trim();
  if (input.name !== undefined && !name) throw new Error('El nombre es requerido');

  const next = await prisma.$transaction(async (tx) => {
    const updated = await tx.financeConcept.update({
      where: { id: concept.id },
      data: {
        name: name ?? undefined,
        kind: input.kind ?? undefined,
        amountCents: typeof input.amountCents === 'number' ? input.amountCents : undefined,
        currency: input.currency ?? undefined,
        isActive: typeof input.isActive === 'boolean' ? input.isActive : undefined,
        autoGenerateOnEnrollment: typeof input.autoGenerateOnEnrollment === 'boolean' ? input.autoGenerateOnEnrollment : undefined,
        chargeType: input.chargeType !== undefined ? input.chargeType : undefined,
        installmentCount: typeof input.installmentCount === 'number' ? input.installmentCount : undefined,
        applySiblingDiscount: typeof input.applySiblingDiscount === 'boolean' ? input.applySiblingDiscount : undefined,
        gradeLevelId: input.gradeLevelId !== undefined ? input.gradeLevelId : undefined,
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
          autoGenerate: updated.autoGenerateOnEnrollment,
          chargeType: updated.chargeType,
          gradeLevelId: updated.gradeLevelId,
        }),
      },
    });

    return updated;
  }).catch((err) => {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new Error(`Ya existe un concepto llamado "${name}". Usa otro nombre.`);
    }
    throw err;
  });

  return next;
}

export async function list() {
  const ctx = await getTenantIdFromSession();

  return prisma.financeConcept.findMany({
    where: { tenantId: ctx.tenantId },
    include: { gradeLevel: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
}
