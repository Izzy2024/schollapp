'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { makeEnrollmentDomainError } from './enrollment-errors';

export type EnrollmentUiStudentOption = {
  id: string;
  label: string;
};

export type EnrollmentUiSectionOption = {
  id: string;
  label: string;
  capacity: number | null;
  enrolledCount: number;
  isFull: boolean;
};

async function getTenantFromSession() {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenant = await prisma.tenant.findUnique({
    where: { slug: session.user.tenantSlug },
    select: { id: true, slug: true },
  });

  if (!tenant) throw makeEnrollmentDomainError('TENANT_SCOPE_VIOLATION', 'Tenant not found for authenticated session');
  return tenant;
}

async function getActiveAcademicYearId(tenantId: string) {
  const year = await prisma.academicYear.findFirst({
    where: { tenantId, isActive: true },
    select: { id: true },
  });
  if (!year) throw makeEnrollmentDomainError('NO_ACTIVE_YEAR', 'No active academic year found');
  return year.id;
}

// Internal helper to avoid duplicating eligible/fallback logic.
async function listEnrollmentUiStudentsImpl(): Promise<{ options: EnrollmentUiStudentOption[]; hasEligible: boolean }> {
  const tenant = await getTenantFromSession();
  const activeYearId = await getActiveAcademicYearId(tenant.id);

  const eligible = await prisma.student.findMany({
    where: {
      tenantId: tenant.id,
      status: 'active',
      enrollments: {
        none: {
          academicYearId: activeYearId,
          status: { in: ['enrolled', 'reenrolled'] },
        },
      },
    },
    select: { id: true, studentCode: true, firstName: true, lastName: true },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    take: 200,
  });

  const hasEligible = eligible.length > 0;

  const students = hasEligible
    ? eligible
    : await prisma.student.findMany({
        where: { tenantId: tenant.id, status: 'active' },
        select: { id: true, studentCode: true, firstName: true, lastName: true },
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
        take: 50,
      });

  const options = students.map((s) => ({
    id: s.id,
    label: `${s.studentCode ?? '—'} · ${s.lastName} ${s.firstName}${hasEligible ? '' : ' (ya inscrito)'}`,
  }));

  return { options, hasEligible };
}

export async function listEnrollmentUiStudents(): Promise<EnrollmentUiStudentOption[]> {
  const { options } = await listEnrollmentUiStudentsImpl();
  return options;
}

export async function hasEnrollmentUiEligibleStudents(): Promise<boolean> {
  const { hasEligible } = await listEnrollmentUiStudentsImpl();
  return hasEligible;
}

export async function listEnrollmentUiSections(): Promise<EnrollmentUiSectionOption[]> {
  const tenant = await getTenantFromSession();
  const activeYearId = await getActiveAcademicYearId(tenant.id);

  const sections = await prisma.section.findMany({
    where: { tenantId: tenant.id, academicYearId: activeYearId },
    select: {
      id: true,
      name: true,
      capacity: true,
      gradeLevel: { select: { name: true } },
      enrollments: {
        where: { academicYearId: activeYearId, status: { in: ['enrolled', 'reenrolled'] } },
        select: { id: true },
      },
    },
    orderBy: [{ gradeLevel: { sortOrder: 'asc' } }, { name: 'asc' }],
    take: 200,
  });

  return sections.map((s) => {
    const enrolledCount = s.enrollments.length;
    const isFull = s.capacity != null ? enrolledCount >= s.capacity : false;
    return {
      id: s.id,
      label: `${s.gradeLevel.name} · ${s.name}`,
      capacity: s.capacity,
      enrolledCount,
      isFull,
    };
  });
}
