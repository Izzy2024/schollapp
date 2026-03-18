'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export type EnrollmentErrorCode =
  | 'TENANT_SCOPE_VIOLATION'
  | 'CAPACITY_EXCEEDED'
  | 'ALREADY_ENROLLED_IN_YEAR'
  | 'NO_ACTIVE_YEAR'
  | 'ENROLLMENT_NOT_FOUND';

export class EnrollmentDomainError extends Error {
  readonly code: EnrollmentErrorCode;

  constructor(code: EnrollmentErrorCode, message: string) {
    super(message);
    this.name = 'EnrollmentDomainError';
    this.code = code;
  }
}

type SessionContext = {
  tenantId: string;
  tenantSlug: string;
  actorUserId: string | null;
};

async function getSessionContext(): Promise<SessionContext> {
  const session = await auth();
  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: session.user.tenantSlug },
    select: { id: true, slug: true },
  });

  if (!tenant) {
    throw new EnrollmentDomainError('TENANT_SCOPE_VIOLATION', 'Tenant not found for authenticated session');
  }

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    actorUserId: session.user.id ?? null,
  };
}

async function getActiveAcademicYear(tenantId: string) {
  const activeYear = await prisma.academicYear.findFirst({
    where: { tenantId, isActive: true },
    select: { id: true, name: true },
  });

  if (!activeYear) {
    throw new EnrollmentDomainError('NO_ACTIVE_YEAR', 'No active academic year found');
  }

  return activeYear;
}

function ensureCapacityOrThrow(enrolledCount: number, capacity: number | null | undefined) {
  if (capacity == null) return;
  if (enrolledCount >= capacity) {
    throw new EnrollmentDomainError('CAPACITY_EXCEEDED', `Section capacity exceeded (${capacity})`);
  }
}

async function createActivityEvent(params: {
  tenantId: string;
  actorUserId: string | null;
  action: 'enrollment.created' | 'enrollment.unenrolled' | 'enrollment.reenrolled';
  entityId: string;
  studentId: string;
  sectionId: string;
  academicYearId: string;
}) {
  await prisma.activityEvent.create({
    data: {
      tenantId: params.tenantId,
      actorUserId: params.actorUserId,
      action: params.action,
      entityType: 'enrollment',
      entityId: params.entityId,
      metadata: JSON.stringify({
        studentId: params.studentId,
        sectionId: params.sectionId,
        academicYearId: params.academicYearId,
      }),
    },
  });
}

export async function getEnrollments(_tenantSlug?: string, academicYearId?: string) {
  const ctx = await getSessionContext();
  const selectedYearId = academicYearId ?? (await getActiveAcademicYear(ctx.tenantId)).id;

  const enrollments = await prisma.enrollment.findMany({
    where: {
      tenantId: ctx.tenantId,
      academicYearId: selectedYearId,
    },
    include: {
      student: true,
      section: { include: { gradeLevel: true } },
    },
    orderBy: { enrolledAt: 'desc' },
  });

  return enrollments.map((e) => ({
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

export async function enrollStudent(studentId: string, sectionId: string, _tenantSlug?: string) {
  const ctx = await getSessionContext();
  const activeYear = await getActiveAcademicYear(ctx.tenantId);

  const existing = await prisma.enrollment.findFirst({
    where: {
      tenantId: ctx.tenantId,
      studentId,
      academicYearId: activeYear.id,
      status: { in: ['enrolled', 'reenrolled'] },
    },
    select: { id: true },
  });

  if (existing) {
    throw new EnrollmentDomainError('ALREADY_ENROLLED_IN_YEAR', 'Student is already enrolled in the active year');
  }

  const section = await prisma.section.findFirst({
    where: { id: sectionId, tenantId: ctx.tenantId },
    include: {
      gradeLevel: true,
      enrollments: { where: { academicYearId: activeYear.id, status: { in: ['enrolled', 'reenrolled'] } } },
    },
  });

  if (!section) {
    throw new EnrollmentDomainError('TENANT_SCOPE_VIOLATION', 'Section not found for tenant');
  }

  ensureCapacityOrThrow(section.enrollments.length, section.capacity);

  const enrollment = await prisma.enrollment.create({
    data: {
      tenantId: ctx.tenantId,
      studentId,
      sectionId,
      academicYearId: activeYear.id,
      status: 'enrolled',
      enrolledAt: new Date(),
    },
  });

  await createActivityEvent({
    tenantId: ctx.tenantId,
    actorUserId: ctx.actorUserId,
    action: 'enrollment.created',
    entityId: enrollment.id,
    studentId,
    sectionId,
    academicYearId: activeYear.id,
  });

  return enrollment;
}

export async function unenrollStudent(enrollmentId: string, _tenantSlug?: string) {
  const ctx = await getSessionContext();

  const existing = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, tenantId: ctx.tenantId },
    select: { id: true, studentId: true, sectionId: true, academicYearId: true },
  });

  if (!existing) {
    throw new EnrollmentDomainError('ENROLLMENT_NOT_FOUND', 'Enrollment not found');
  }

  const enrollment = await prisma.enrollment.update({
    where: { id: existing.id },
    data: { status: 'unenrolled' },
  });

  await createActivityEvent({
    tenantId: ctx.tenantId,
    actorUserId: ctx.actorUserId,
    action: 'enrollment.unenrolled',
    entityId: enrollment.id,
    studentId: existing.studentId,
    sectionId: existing.sectionId,
    academicYearId: existing.academicYearId,
  });

  return enrollment;
}

export async function reenrollStudent(studentId: string, sectionId: string, _tenantSlug?: string) {
  const ctx = await getSessionContext();
  const activeYear = await getActiveAcademicYear(ctx.tenantId);

  const section = await prisma.section.findFirst({
    where: { id: sectionId, tenantId: ctx.tenantId },
    include: {
      enrollments: { where: { academicYearId: activeYear.id, status: { in: ['enrolled', 'reenrolled'] } } },
    },
  });

  if (!section) {
    throw new EnrollmentDomainError('TENANT_SCOPE_VIOLATION', 'Section not found for tenant');
  }

  ensureCapacityOrThrow(section.enrollments.length, section.capacity);

  const enrollment = await prisma.enrollment.upsert({
    where: {
      tenantId_studentId_academicYearId: {
        tenantId: ctx.tenantId,
        studentId,
        academicYearId: activeYear.id,
      },
    },
    create: {
      tenantId: ctx.tenantId,
      studentId,
      sectionId,
      academicYearId: activeYear.id,
      status: 'reenrolled',
      enrolledAt: new Date(),
    },
    update: {
      sectionId,
      status: 'reenrolled',
    },
  });

  await createActivityEvent({
    tenantId: ctx.tenantId,
    actorUserId: ctx.actorUserId,
    action: 'enrollment.reenrolled',
    entityId: enrollment.id,
    studentId,
    sectionId,
    academicYearId: activeYear.id,
  });

  return enrollment;
}

export async function getStudentsWithoutEnrollment(_tenantSlug?: string) {
  const ctx = await getSessionContext();
  const activeYear = await getActiveAcademicYear(ctx.tenantId);

  const students = await prisma.student.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: 'active',
      enrollments: { none: { academicYearId: activeYear.id, status: { in: ['enrolled', 'reenrolled'] } } },
    },
    select: { id: true, firstName: true, lastName: true, studentCode: true },
    orderBy: { createdAt: 'desc' },
  });

  return students;
}

export async function getSectionsWithCapacity(_tenantSlug?: string) {
  const ctx = await getSessionContext();
  const activeYear = await getActiveAcademicYear(ctx.tenantId);

  const sections = await prisma.section.findMany({
    where: { tenantId: ctx.tenantId },
    include: {
      gradeLevel: true,
      enrollments: { where: { academicYearId: activeYear.id, status: { in: ['enrolled', 'reenrolled'] } } },
    },
    orderBy: [{ gradeLevel: { name: 'asc' } }, { name: 'asc' }],
  });

  return sections.map((s) => ({
    id: s.id,
    name: s.name,
    gradeLevelName: s.gradeLevel.name,
    capacity: s.capacity,
    enrolledCount: s.enrollments.length,
    isFull: s.capacity != null ? s.enrollments.length >= s.capacity : false,
  }));
}
