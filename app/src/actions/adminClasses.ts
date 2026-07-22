'use server';

import { auth } from '@/auth';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ensureDefaultPrimaryCatalog } from '@/lib/defaultPrimaryCatalog';

export async function getSectionSubjects(
  tenantSlug?: string,
  filters?: { gradeLevelId?: string; sectionId?: string; subjectId?: string; hasTeacher?: boolean }
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  await ensureDefaultPrimaryCatalog(tenant.id);

  const where: Prisma.SectionSubjectWhereInput = { tenantId: tenant.id };
  
  if (filters?.sectionId) {
    where.sectionId = filters.sectionId;
  } else if (filters?.gradeLevelId) {
    where.section = { gradeLevelId: filters.gradeLevelId };
  }
  
  if (filters?.subjectId) {
    where.subjectId = filters.subjectId;
  }
  
  if (filters?.hasTeacher !== undefined) {
    if (filters.hasTeacher) {
      where.staffId = { not: null };
    } else {
      where.staffId = null;
    }
  }

  const sectionSubjects = await prisma.sectionSubject.findMany({
    where,
    include: {
      subject: true,
      staff: true,
      section: {
        include: {
          gradeLevel: true,
          enrollments: { where: { status: 'enrolled' } }
        }
      }
    },
    orderBy: [
      { section: { gradeLevel: { sortOrder: 'asc' } } },
      { section: { name: 'asc' } },
      { subject: { name: 'asc' } }
    ],
  });

  return sectionSubjects.map(ss => ({
    id: ss.id,
    subjectId: ss.subjectId,
    subjectName: ss.subject.name,
    gradeLevelId: ss.section.gradeLevel.id,
    gradeLevelName: ss.section.gradeLevel.name,
    sectionId: ss.sectionId,
    sectionName: ss.section.name,
    staffId: ss.staffId,
    staffName: ss.staff ? ss.staff.fullName : null,
    enrolledCount: ss.section.enrollments.length,
  }));
}

export async function createSectionSubject(sectionId: string, subjectId: string, staffId: string | null, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const existing = await prisma.sectionSubject.findFirst({
    where: { tenantId: tenant.id, sectionId, subjectId },
  });

  if (existing) {
    return { error: 'Esta clase ya existe' };
  }

  await prisma.sectionSubject.create({
    data: {
      tenantId: tenant.id,
      sectionId,
      subjectId,
      staffId,
    },
  });

  return { success: true };
}

export async function assignTeacher(sectionSubjectId: string, staffId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  await prisma.sectionSubject.update({
    where: { id: sectionSubjectId },
    data: { staffId },
  });

  await prisma.activityEvent.create({
    data: {
      tenantId: tenant.id,
      actorUserId: session.user.id,
      entityType: 'sectionSubject',
      entityId: sectionSubjectId,
      action: 'teacher_assigned',
      metadata: JSON.stringify({ staffId }),
      occurredAt: new Date(),
    }
  });

  return { success: true };
}

export async function removeTeacher(sectionSubjectId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  await prisma.sectionSubject.update({
    where: { id: sectionSubjectId },
    data: { staffId: null },
  });

  return { success: true };
}

export async function getStaffList(tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const staff = await prisma.staff.findMany({
    where: { tenantId: tenant.id, isActive: true },
    include: { user: true },
    orderBy: { fullName: 'asc' },
  });

  return staff.map(s => ({
    id: s.id,
    fullName: s.fullName,
  }));
}

export async function getSectionsForTenant(tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  await ensureDefaultPrimaryCatalog(tenant.id);

  const academicYear = await prisma.academicYear.findFirst({
    where: { tenantId: tenant.id, isActive: true },
  });

  if (!academicYear) throw new Error('No active academic year found');

  const sections = await prisma.section.findMany({
    where: { tenantId: tenant.id, academicYearId: academicYear.id },
    include: { gradeLevel: true },
    orderBy: [
      { gradeLevel: { sortOrder: 'asc' } },
      { name: 'asc' }
    ],
  });

  return sections.map(s => ({
    id: s.id,
    name: s.name,
    gradeLevelId: s.gradeLevelId,
    gradeLevelName: s.gradeLevel.name,
  }));
}
