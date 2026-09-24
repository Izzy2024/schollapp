'use server';

import prisma from '@/lib/prisma';
import { getTestPrisma } from '@/lib/test-seams';
import { requireTenant } from '@/lib/authz';
import { STABLE_ERROR, stableError } from '@/lib/errors';

export async function getEnrollmentStats(_legacyTenantSlug?: string) {
  const ctx = await requireTenant();
  if (!ctx.roles.includes('admin') && !ctx.roles.includes('director')) {
    throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
  }

  const db: typeof prisma = (getTestPrisma<typeof prisma>() ?? prisma) as any;
  const tenantId = ctx.tenantId;

  const activeYear = await db.academicYear.findFirst({
    where: { tenantId, isActive: true },
  });
  if (!activeYear) throw new Error('No active academic year found');

  const totalEnrolled = await db.enrollment.count({
    where: { tenantId, academicYearId: activeYear.id, status: 'enrolled' }
  });

  const enrolledIdsResult = await db.enrollment.findMany({
    where: { tenantId, academicYearId: activeYear.id, status: 'enrolled' },
    select: { studentId: true }
  });
  const enrolledIds = enrolledIdsResult.map(e => e.studentId);

  const studentsWithoutEnrollment = await db.student.count({
    where: {
      tenantId,
      status: 'active',
      id: { notIn: enrolledIds.length ? enrolledIds : undefined }
    }
  });

  const sectionsData = await db.section.findMany({
    where: { tenantId, academicYearId: activeYear.id },
    include: {
      gradeLevel: true,
      _count: {
        select: { enrollments: { where: { status: 'enrolled', academicYearId: activeYear.id } } }
      }
    },
    orderBy: [
      { gradeLevel: { sortOrder: 'asc' } },
      { name: 'asc' }
    ]
  });

  const sections = sectionsData.map(s => {
    const enrolled = s._count.enrollments;
    const capacity = s.capacity || 0;
    const pct = capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0;
    return {
      gradeName: s.gradeLevel.name,
      sectionName: s.name,
      enrolled,
      capacity,
      pct
    };
  });

  // aggregate by grade
  const gradeMap = new Map();
  sectionsData.forEach(s => {
    const gn = s.gradeLevel.name;
    if (!gradeMap.has(gn)) {
      gradeMap.set(gn, { gradeName: gn, enrolled: 0, capacity: 0 });
    }
    const curr = gradeMap.get(gn);
    curr.enrolled += s._count.enrollments;
    curr.capacity += (s.capacity || 0);
  });

  const byGrade = Array.from(gradeMap.values());

  return {
    totalEnrolled,
    byGrade,
    sections,
    studentsWithoutEnrollment
  };
}
