'use server';

import { auth } from '@/auth';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getCurricularPlan(sectionSubjectId: string, termId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  if (!sectionSubjectId || !termId) return { units: [] };

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const teacher = await prisma.staff.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id }
  });
  if (!teacher) throw new Error('Teacher profile not found');

  const ss = await prisma.sectionSubject.findUnique({ where: { id: sectionSubjectId } });
  if (!ss || ss.staffId !== teacher.id) throw new Error('Unauthorized');

  const units = await prisma.curricularUnit.findMany({
    where: {
      tenantId: tenant.id,
      sectionSubjectId,
      termId
    },
    orderBy: { order: 'asc' },
    include: {
      topics: {
        orderBy: { order: 'asc' }
      }
    }
  });

  return {
    units: units.map(u => ({
      ...u,
      startDate: u.startDate?.toISOString() || null,
      endDate: u.endDate?.toISOString() || null,
      topics: u.topics.map(t => ({
        ...t,
        date: t.date?.toISOString() || null,
      }))
    }))
  };
}

export async function createUnit(
  sectionSubjectId: string,
  termId: string,
  name: string,
  description: string,
  startDateIso: string,
  endDateIso: string,
  tenantSlug?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const teacher = await prisma.staff.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id }
  });
  if (!teacher) throw new Error('Teacher profile not found');

  const ss = await prisma.sectionSubject.findUnique({ where: { id: sectionSubjectId } });
  if (!ss || ss.staffId !== teacher.id) throw new Error('Unauthorized');

  const maxOrderUnit = await prisma.curricularUnit.findFirst({
    where: { tenantId: tenant.id, sectionSubjectId, termId },
    orderBy: { order: 'desc' }
  });
  
  const order = maxOrderUnit ? maxOrderUnit.order + 1 : 1;

  await prisma.curricularUnit.create({
    data: {
      tenantId: tenant.id,
      sectionSubjectId,
      termId,
      name,
      description,
      startDate: new Date(startDateIso),
      endDate: new Date(endDateIso),
      order
    }
  });

  revalidatePath('/teacher/planning');
  return { success: true };
}

export async function updateUnit(
  unitId: string,
  data: { name?: string; description?: string; startDateIso?: string; endDateIso?: string },
  tenantSlug?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenantSlugSession = session.user.tenantSlug;
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug || tenantSlugSession } });
  if (!tenant) throw new Error('Tenant not found');

  const teacher = await prisma.staff.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id }
  });
  if (!teacher) throw new Error('Teacher profile not found');

  const unit = await prisma.curricularUnit.findUnique({ where: { id: unitId }, include: { sectionSubject: true } });
  if (!unit || unit.sectionSubject.staffId !== teacher.id) throw new Error('Unauthorized');

  const updateData: Record<string, any> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.startDateIso !== undefined) updateData.startDate = new Date(data.startDateIso);
  if (data.endDateIso !== undefined) updateData.endDate = new Date(data.endDateIso);

  await prisma.curricularUnit.update({
    where: { id: unitId },
    data: updateData
  });

  revalidatePath('/teacher/planning');
  return { success: true };
}

export async function deleteUnit(unitId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenantSlugSession = session.user.tenantSlug;
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug || tenantSlugSession } });
  if (!tenant) throw new Error('Tenant not found');

  const teacher = await prisma.staff.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id }
  });
  if (!teacher) throw new Error('Teacher profile not found');

  const unit = await prisma.curricularUnit.findUnique({ where: { id: unitId }, include: { sectionSubject: true } });
  if (!unit || unit.sectionSubject.staffId !== teacher.id) throw new Error('Unauthorized');

  await prisma.curricularUnit.delete({
    where: { id: unitId }
  });
  revalidatePath('/teacher/planning');
  return { success: true };
}

export async function createTopic(
  unitId: string,
  name: string,
  description: string,
  dateIso: string,
  tenantSlug?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenantSlugSession = session.user.tenantSlug;
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug || tenantSlugSession } });
  if (!tenant) throw new Error('Tenant not found');

  const teacher = await prisma.staff.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id }
  });
  if (!teacher) throw new Error('Teacher profile not found');

  const unit = await prisma.curricularUnit.findUnique({ where: { id: unitId }, include: { sectionSubject: true } });
  if (!unit || unit.sectionSubject.staffId !== teacher.id) throw new Error('Unauthorized');

  const maxOrderTopic = await prisma.curricularTopic.findFirst({
    where: { tenantId: tenant.id, unitId },
    orderBy: { order: 'desc' }
  });

  const order = maxOrderTopic ? maxOrderTopic.order + 1 : 1;

  await prisma.curricularTopic.create({
    data: {
      tenantId: tenant.id,
      unitId,
      name,
      description,
      date: new Date(dateIso),
      order
    }
  });

  revalidatePath('/teacher/planning');
  return { success: true };
}

export async function deleteTopic(topicId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenantSlugSession = session.user.tenantSlug;
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug || tenantSlugSession } });
  if (!tenant) throw new Error('Tenant not found');

  const teacher = await prisma.staff.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id }
  });
  if (!teacher) throw new Error('Teacher profile not found');

  const topic = await prisma.curricularTopic.findUnique({ where: { id: topicId }, include: { unit: { include: { sectionSubject: true } } } });
  if (!topic || topic.unit.sectionSubject.staffId !== teacher.id) throw new Error('Unauthorized');

  await prisma.curricularTopic.delete({
    where: { id: topicId }
  });
  revalidatePath('/teacher/planning');
  return { success: true };
}

export async function reorderUnit(unitId: string, direction: 'up' | 'down', tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenantSlugSession = session.user.tenantSlug;
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug || tenantSlugSession } });
  if (!tenant) throw new Error('Tenant not found');

  const teacher = await prisma.staff.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id }
  });
  if (!teacher) throw new Error('Teacher profile not found');

  const unit = await prisma.curricularUnit.findUnique({ where: { id: unitId }, include: { sectionSubject: true } });
  if (!unit || unit.sectionSubject.staffId !== teacher.id) throw new Error('Unidad no encontrada o no autorizada');

  const targetOrder = unit.order + (direction === 'up' ? -1 : 1);

  const adjacent = await prisma.curricularUnit.findFirst({
    where: {
      sectionSubjectId: unit.sectionSubjectId,
      termId: unit.termId,
      order: targetOrder
    }
  });

  if (adjacent) {
    await prisma.$transaction([
      prisma.curricularUnit.update({ where: { id: unit.id }, data: { order: targetOrder } }),
      prisma.curricularUnit.update({ where: { id: adjacent.id }, data: { order: unit.order } })
    ]);
  }

  revalidatePath('/teacher/planning');
  return { success: true };
}
