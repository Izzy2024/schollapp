'use server';

import { auth } from '@/auth';

import prisma from '@/lib/prisma';

export async function getEnrollments(tenantSlug?: string, academicYearId?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  let activeYearId = academicYearId;
  if (!activeYearId) {
    const activeYear = await prisma.academicYear.findFirst({
      where: { tenantId: tenant.id, isActive: true },
    });
    if (!activeYear) throw new Error('No active academic year found');
    activeYearId = activeYear.id;
  }

  const enrollments = await prisma.enrollment.findMany({
    where: { tenantId: tenant.id, academicYearId: activeYearId },
    include: {
      student: true,
      section: { include: { gradeLevel: true } },
    },
    orderBy: { enrolledAt: 'desc' },
  });

  return enrollments.map(e => ({
    id: e.id,
    studentId: e.studentId,
    studentName: `${e.student.firstName} ${e.student.lastName}`,
    studentCode: e.student.studentCode,
    gradeLevelName: e.section.gradeLevel.name,
    sectionName: e.section.name,
    status: e.status,
    enrolledAt: e.enrolledAt.toISOString(),
  }));
}

export async function enrollStudent(studentId: string, sectionId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const activeYear = await prisma.academicYear.findFirst({
    where: { tenantId: tenant.id, isActive: true },
  });
  if (!activeYear) throw new Error('No active academic year found');

  // Check if already enrolled
  const existing = await prisma.enrollment.findFirst({
    where: { tenantId: tenant.id, studentId, academicYearId: activeYear.id, status: 'enrolled' },
  });

  if (existing) {
    return { error: 'El alumno ya está inscrito en este ciclo' };
  }

  // Check section capacity
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { _count: { select: { enrollments: { where: { status: 'enrolled' } } } } }
  });

  if (!section) throw new Error('Section not found');

  if (section.capacity && section._count.enrollments >= section.capacity) {
    return { error: `La sección está llena (capacidad: ${section.capacity})` };
  }

  await prisma.enrollment.create({
    data: {
      tenantId: tenant.id,
      studentId,
      sectionId,
      academicYearId: activeYear.id,
      status: 'enrolled',
    }
  });

  return { success: true };
}

export async function unenrollStudent(enrollmentId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  await prisma.enrollment.update({
    where: { id: enrollmentId },
    data: { status: 'withdrawn' },
  });
  return { success: true };
}

export async function getStudentsWithoutEnrollment(tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const activeYear = await prisma.academicYear.findFirst({
    where: { tenantId: tenant.id, isActive: true },
  });
  if (!activeYear) throw new Error('No active academic year found');

  const enrolledIds = (await prisma.enrollment.findMany({
    where: { tenantId: tenant.id, academicYearId: activeYear.id, status: 'enrolled' },
    select: { studentId: true }
  })).map(e => e.studentId);

  const students = await prisma.student.findMany({
    where: {
      tenantId: tenant.id,
      status: 'active',
      id: { notIn: enrolledIds }
    },
    orderBy: { lastName: 'asc' },
  });

  return students.map(s => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    studentCode: s.studentCode || '—',
  }));
}

export async function getSectionsWithCapacity(tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const activeYear = await prisma.academicYear.findFirst({
    where: { tenantId: tenant.id, isActive: true },
  });
  if (!activeYear) throw new Error('No active academic year found');

  const sections = await prisma.section.findMany({
    where: { tenantId: tenant.id, academicYearId: activeYear.id },
    include: {
      gradeLevel: true,
      enrollments: { where: { status: 'enrolled', academicYearId: activeYear.id } }
    },
    orderBy: [{ gradeLevel: { sortOrder: 'asc' } }, { name: 'asc' }]
  });

  return sections.map(s => {
    const enrolledCount = s.enrollments.length;
    return {
      id: s.id,
      name: s.name,
      gradeLevelName: s.gradeLevel.name,
      capacity: s.capacity || 0,
      enrolledCount,
      isFull: s.capacity ? enrolledCount >= s.capacity : false,
    };
  });
}
