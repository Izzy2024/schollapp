'use server';

import { auth } from '@/auth';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { ensureDefaultPrimaryCatalog } from '@/lib/defaultPrimaryCatalog';
import { requirePermission } from '@/lib/authz';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    return;
  }
}


export async function getSubjectsAndSections(tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  await ensureDefaultPrimaryCatalog(tenant.id);

  const subjects = await prisma.subject.findMany({
    where: { tenantId: tenant.id }
  });

  const sectionsList = await prisma.section.findMany({
    where: { tenantId: tenant.id },
    include: { gradeLevel: true },
    orderBy: [{ gradeLevel: { sortOrder: 'asc' } }, { name: 'asc' }]
  });

  const sections = sectionsList.map(s => ({
    id: s.id,
    displayName: `${s.gradeLevel.name} - ${s.name}`
  }));

  return { 
    subjects: subjects.map(s => ({ id: s.id, name: s.name })), 
    sections 
  };
}

export async function createClassRequest(
  _staffId: string,
  subjectId: string,
  sectionId: string,
  justification: string,
  _tenantSlug?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const staff = await prisma.staff.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id },
  });
  if (!staff) return { success: false, error: 'No se encontró tu perfil de docente' };

  const [subject, section] = await Promise.all([
    prisma.subject.findFirst({ where: { id: subjectId, tenantId: tenant.id }, select: { id: true } }),
    prisma.section.findFirst({ where: { id: sectionId, tenantId: tenant.id }, select: { id: true } }),
  ]);
  if (!subject || !section) return { success: false, error: 'Materia o sección no encontrada' };

  const alreadyAssigned = await prisma.sectionSubject.findFirst({
    where: {
      tenantId: tenant.id,
      sectionId,
      subjectId,
      staffId: staff.id,
    }
  });
  if (alreadyAssigned) {
    return { success: false, error: 'Esa clase ya está asignada a este docente.' };
  }

  const existing = await prisma.classRequest.findFirst({
    where: {
      tenantId: tenant.id,
      staffId: staff.id,
      subjectId,
      sectionId,
      status: 'pending'
    }
  });

  if (existing) {
    return { success: false, error: 'Ya tienes una solicitud pendiente para esta materia y sección.' };
  }

  await prisma.classRequest.create({
    data: {
      tenantId: tenant.id,
      staffId: staff.id,
      subjectId,
      sectionId,
      justification,
      status: 'pending'
    }
  });

  return { success: true };
}

export async function getClassRequests(tenantSlug?: string, status?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const where: Prisma.ClassRequestWhereInput = { tenantId: tenant.id };
  if (status) {
    where.status = status;
  }

  const requests = await prisma.classRequest.findMany({
    where,
    include: {
      staff: { include: { user: true } },
      subject: true,
      section: { include: { gradeLevel: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return requests.map(req => ({
    id: req.id,
    staffName: req.staff.user?.fullName || req.staff.fullName,
    subjectName: req.subject.name,
    gradeLevelName: req.section.gradeLevel.name,
    sectionName: req.section.name,
    justification: req.justification,
    status: req.status,
    createdAt: req.createdAt.toISOString(),
    reviewedAt: req.reviewedAt?.toISOString() || null,
  }));
}

export async function approveClassRequest(requestId: string, _tenantSlug?: string) {
  const ctx = await requirePermission('schedule:manage');

  const req = await prisma.classRequest.findFirst({
    where: { id: requestId, tenantId: ctx.tenantId },
  });
  if (!req) throw new Error('Request not found');
  if (req.status !== 'pending') return { success: false, error: 'La solicitud ya fue procesada.' };

  await prisma.classRequest.update({
    where: { id: requestId },
    data: {
      status: 'approved',
      reviewedById: ctx.userId,
      reviewedAt: new Date(),
    }
  });

  // Then upsert the sectionSubject
  const sectionSubject = await prisma.sectionSubject.upsert({
    where: {
      tenantId_sectionId_subjectId: {
        tenantId: ctx.tenantId,
        sectionId: req.sectionId,
        subjectId: req.subjectId,
      }
    },
    create: {
      tenantId: ctx.tenantId,
      sectionId: req.sectionId,
      subjectId: req.subjectId,
      staffId: req.staffId,
    },
    update: {
      staffId: req.staffId,
    }
  });

  const scheduleCount = await prisma.classSchedule.count({
    where: { tenantId: ctx.tenantId, sectionSubjectId: sectionSubject.id }
  });

  if (scheduleCount === 0) {
    const templateSchedules = await prisma.classSchedule.findMany({
      where: {
        tenantId: ctx.tenantId,
        sectionSubject: { subjectId: req.subjectId },
        sectionSubjectId: { not: sectionSubject.id },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      take: 3,
    });

    if (templateSchedules.length > 0) {
      await prisma.classSchedule.createMany({
        data: templateSchedules.map((tpl) => ({
          tenantId: ctx.tenantId,
          sectionSubjectId: sectionSubject.id,
          dayOfWeek: tpl.dayOfWeek,
          startTime: tpl.startTime,
          endTime: tpl.endTime,
          room: tpl.room,
        })),
      });
    }
  }

  // Create ActivityEvent
  await prisma.activityEvent.create({
    data: {
      tenantId: ctx.tenantId,
      actorUserId: ctx.userId,
      entityType: 'sectionSubject',
      entityId: sectionSubject.id,
      action: 'class_request_approved',
      metadata: JSON.stringify({ requestId }),
      occurredAt: new Date(),
    }
  });

  safeRevalidate('/teacher');
  safeRevalidate('/teacher/schedule');
  safeRevalidate('/teacher/gradebook');
  safeRevalidate('/admin/class-requests');
  safeRevalidate('/director/class-requests');

  return { success: true };
}

export async function rejectClassRequest(requestId: string, _tenantSlug?: string) {
  const ctx = await requirePermission('schedule:manage');

  const req = await prisma.classRequest.findFirst({
    where: { id: requestId, tenantId: ctx.tenantId },
  });
  if (!req) throw new Error('Request not found');
  if (req.status !== 'pending') return { success: false, error: 'La solicitud ya fue procesada.' };

  await prisma.classRequest.update({
    where: { id: requestId },
    data: {
      status: 'rejected',
      reviewedById: ctx.userId,
      reviewedAt: new Date(),
    }
  });

  safeRevalidate('/admin/class-requests');
  safeRevalidate('/director/class-requests');

  return { success: true };
}
