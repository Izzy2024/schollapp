'use server';

import { auth } from '@/auth';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { ensureDefaultPrimaryCatalog } from '@/lib/defaultPrimaryCatalog';

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
  staffId: string,
  subjectId: string,
  sectionId: string,
  justification: string,
  tenantSlug?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const alreadyAssigned = await prisma.sectionSubject.findFirst({
    where: {
      tenantId: tenant.id,
      sectionId,
      subjectId,
      staffId,
    }
  });
  if (alreadyAssigned) {
    return { success: false, error: 'Esa clase ya está asignada a este docente.' };
  }

  const existing = await prisma.classRequest.findFirst({
    where: {
      tenantId: tenant.id,
      staffId,
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
      staffId,
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

export async function approveClassRequest(requestId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const req = await prisma.classRequest.findUnique({
    where: { id: requestId }
  });
  if (!req) throw new Error('Request not found');
  if (req.tenantId !== tenant.id) throw new Error('Request does not belong to this tenant');
  if (req.status !== 'pending') return { success: false, error: 'La solicitud ya fue procesada.' };

  const reviewer = await prisma.user.findFirst({
    where: {
      memberships: { some: { tenantId: tenant.id } },
      OR: [{ email: 'admin@demo.com' }, { email: 'director@demo.com' }]
    },
    orderBy: { createdAt: 'asc' }
  }) ?? await prisma.user.findFirst({
    where: { memberships: { some: { tenantId: tenant.id } } },
    orderBy: { createdAt: 'asc' }
  });

  await prisma.classRequest.update({
    where: { id: requestId },
    data: {
      status: 'approved',
      reviewedById: reviewer?.id ?? null,
      reviewedAt: new Date(),
    }
  });

  // Then upsert the sectionSubject
  const sectionSubject = await prisma.sectionSubject.upsert({
    where: {
      tenantId_sectionId_subjectId: {
        tenantId: tenant.id,
        sectionId: req.sectionId,
        subjectId: req.subjectId,
      }
    },
    create: {
      tenantId: tenant.id,
      sectionId: req.sectionId,
      subjectId: req.subjectId,
      staffId: req.staffId,
    },
    update: {
      staffId: req.staffId,
    }
  });

  const scheduleCount = await prisma.classSchedule.count({
    where: { tenantId: tenant.id, sectionSubjectId: sectionSubject.id }
  });

  if (scheduleCount === 0) {
    const templateSchedules = await prisma.classSchedule.findMany({
      where: {
        tenantId: tenant.id,
        sectionSubject: { subjectId: req.subjectId },
        sectionSubjectId: { not: sectionSubject.id },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      take: 3,
    });

    if (templateSchedules.length > 0) {
      await prisma.classSchedule.createMany({
        data: templateSchedules.map((tpl) => ({
          tenantId: tenant.id,
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
      tenantId: tenant.id,
      actorUserId: reviewer?.id ?? null,
      entityType: 'sectionSubject',
      entityId: sectionSubject.id,
      action: 'class_request_approved',
      metadata: JSON.stringify({ requestId }),
      occurredAt: new Date(),
    }
  });

  revalidatePath('/teacher');
  revalidatePath('/teacher/schedule');
  revalidatePath('/teacher/gradebook');
  revalidatePath('/admin/class-requests');
  revalidatePath('/director/class-requests');

  return { success: true };
}

export async function rejectClassRequest(requestId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const req = await prisma.classRequest.findUnique({
    where: { id: requestId }
  });
  if (!req) throw new Error('Request not found');
  if (req.tenantId !== tenant.id) throw new Error('Request does not belong to this tenant');
  if (req.status !== 'pending') return { success: false, error: 'La solicitud ya fue procesada.' };

  const reviewer = await prisma.user.findFirst({
    where: {
      memberships: { some: { tenantId: tenant.id } },
      OR: [{ email: 'admin@demo.com' }, { email: 'director@demo.com' }]
    },
    orderBy: { createdAt: 'asc' }
  }) ?? await prisma.user.findFirst({
    where: { memberships: { some: { tenantId: tenant.id } } },
    orderBy: { createdAt: 'asc' }
  });

  await prisma.classRequest.update({
    where: { id: requestId },
    data: {
      status: 'rejected',
      reviewedById: reviewer?.id ?? null,
      reviewedAt: new Date(),
    }
  });

  revalidatePath('/admin/class-requests');
  revalidatePath('/director/class-requests');

  return { success: true };
}
