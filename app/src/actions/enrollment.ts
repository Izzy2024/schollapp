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
      entityType: 'enrollment',
      entityId: params.entityId,
      action: params.action,
      metadata: JSON.stringify({
        tenantId: params.tenantId,
        actorUserId: params.actorUserId,
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

  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!student) {
    throw new EnrollmentDomainError('TENANT_SCOPE_VIOLATION', 'Student is outside tenant scope');
  }

  const section = await prisma.section.findFirst({
    where: { id: sectionId, tenantId: ctx.tenantId, academicYearId: activeYear.id },
    include: { _count: { select: { enrollments: { where: { status: 'enrolled', academicYearId: activeYear.id } } } } },
  });
  if (!section) {
    throw new EnrollmentDomainError('TENANT_SCOPE_VIOLATION', 'Section is outside tenant scope');
  }

  const existing = await prisma.enrollment.findFirst({
    where: {
      tenantId: ctx.tenantId,
      studentId,
      academicYearId: activeYear.id,
      status: 'enrolled',
    },
    select: { id: true },
  });

  if (existing) {
    throw new EnrollmentDomainError('ALREADY_ENROLLED_IN_YEAR', 'Student is already enrolled in this academic year');
  }

  ensureCapacityOrThrow(section._count.enrollments, section.capacity);

  const enrollment = await prisma.enrollment.create({
    data: {
      tenantId: ctx.tenantId,
      studentId,
      sectionId,
      academicYearId: activeYear.id,
      status: 'enrolled',
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

  return { success: true };
}

export async function unenrollStudent(enrollmentId: string, _tenantSlug?: string) {
  const ctx = await getSessionContext();

  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId, tenantId: ctx.tenantId },
    select: {
      id: true,
      studentId: true,
      sectionId: true,
      academicYearId: true,
      status: true,
    },
  });

  if (!enrollment) {
    throw new EnrollmentDomainError('ENROLLMENT_NOT_FOUND', 'Enrollment not found in tenant scope');
  }

  await prisma.enrollment.updateMany({
    where: { id: enrollmentId, tenantId: ctx.tenantId },
    data: { status: 'withdrawn' },
  });

  await createActivityEvent({
    tenantId: ctx.tenantId,
    actorUserId: ctx.actorUserId,
    action: 'enrollment.unenrolled',
    entityId: enrollment.id,
    studentId: enrollment.studentId,
    sectionId: enrollment.sectionId,
    academicYearId: enrollment.academicYearId,
  });

  return { success: true };
}

export async function reenrollStudent(studentId: string, sectionId: string, _tenantSlug?: string) {
  const ctx = await getSessionContext();
  const activeYear = await getActiveAcademicYear(ctx.tenantId);

  const student = await prisma.student.findFirst({
    where: { id: studentId, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!student) {
    throw new EnrollmentDomainError('TENANT_SCOPE_VIOLATION', 'Student is outside tenant scope');
  }

  const section = await prisma.section.findFirst({
    where: { id: sectionId, tenantId: ctx.tenantId, academicYearId: activeYear.id },
    include: { _count: { select: { enrollments: { where: { status: 'enrolled', academicYearId: activeYear.id } } } } },
  });
  if (!section) {
    throw new EnrollmentDomainError('TENANT_SCOPE_VIOLATION', 'Section is outside tenant scope');
  }

  const existingInTargetYear = await prisma.enrollment.findFirst({
    where: {
      tenantId: ctx.tenantId,
      studentId,
      academicYearId: activeYear.id,
      status: 'enrolled',
    },
    select: { id: true },
  });

  if (existingInTargetYear) {
    throw new EnrollmentDomainError('ALREADY_ENROLLED_IN_YEAR', 'Student is already enrolled in target academic year');
  }

  ensureCapacityOrThrow(section._count.enrollments, section.capacity);

  const enrollment = await prisma.enrollment.create({
    data: {
      tenantId: ctx.tenantId,
      studentId,
      sectionId,
      academicYearId: activeYear.id,
      status: 'enrolled',
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

  return { success: true };
}

export async function getStudentsWithoutEnrollment(_tenantSlug?: string) {
  const ctx = await getSessionContext();
  const activeYear = await getActiveAcademicYear(ctx.tenantId);

  const enrolledIds = (
    await prisma.enrollment.findMany({
      where: {
        tenantId: ctx.tenantId,
        academicYearId: activeYear.id,
        status: 'enrolled',
      },
      select: { studentId: true },
    })
  ).map((e) => e.studentId);

  const students = await prisma.student.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: 'active',
      id: { notIn: enrolledIds },
    },
    orderBy: { lastName: 'asc' },
  });

  return students.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    studentCode: s.studentCode || '—',
  }));
}

export async function getSectionsWithCapacity(_tenantSlug?: string) {
  const ctx = await getSessionContext();
  const activeYear = await getActiveAcademicYear(ctx.tenantId);

  const sections = await prisma.section.findMany({
    where: { tenantId: ctx.tenantId, academicYearId: activeYear.id },
    include: {
      gradeLevel: true,
      enrollments: { where: { status: 'enrolled', academicYearId: activeYear.id } },
    },
    orderBy: [{ gradeLevel: { sortOrder: 'asc' } }, { name: 'asc' }],
  });

  return sections.map((s) => {
    const enrolledCount = s.enrollments.length;
    const hasLimit = s.capacity != null;
    return {
      id: s.id,
      name: s.name,
      gradeLevelName: s.gradeLevel.name,
      capacity: s.capacity,
      enrolledCount,
      isFull: hasLimit ? enrolledCount >= (s.capacity as number) : false,
    };
  });
}
