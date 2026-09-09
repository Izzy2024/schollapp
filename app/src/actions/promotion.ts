'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import { hasPermission } from '@/lib/rbac';

// ponytail: revalidatePath needs a Next.js request context; contract tests run
// this action outside one, so failures here are swallowed (cache staleness, not correctness).
function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // no-op outside a Next.js request context (e.g. tests)
  }
}

async function getAdminTenant() {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenant = await prisma.tenant.findUnique({ where: { slug: session.user.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const ok = await hasPermission(tenant.id, session.user.id, 'students:manage');
  if (!ok) {
    throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
  }

  return tenant;
}

export type PromotionPreviewRow = {
  sectionId: string;
  gradeLevelName: string;
  sectionName: string;
  studentCount: number;
  targetGradeLevelName: string | null; // null => this cohort graduates, no next grade
};

export async function previewPromotion(): Promise<PromotionPreviewRow[]> {
  const tenant = await getAdminTenant();

  const activeYear = await prisma.academicYear.findFirst({ where: { tenantId: tenant.id, isActive: true } });
  if (!activeYear) return [];

  const gradeLevels = await prisma.gradeLevel.findMany({ where: { tenantId: tenant.id }, orderBy: { sortOrder: 'asc' } });

  const sections = await prisma.section.findMany({
    where: { tenantId: tenant.id, academicYearId: activeYear.id },
    include: {
      gradeLevel: true,
      enrollments: { where: { status: { in: ['enrolled', 'reenrolled'] } } },
    },
  });

  return sections
    .filter((s) => s.enrollments.length > 0)
    .map((s) => {
      const idx = gradeLevels.findIndex((g) => g.id === s.gradeLevelId);
      const next = idx >= 0 ? gradeLevels[idx + 1] : undefined;
      return {
        sectionId: s.id,
        gradeLevelName: s.gradeLevel.name,
        sectionName: s.name,
        studentCount: s.enrollments.length,
        targetGradeLevelName: next?.name ?? null,
      };
    });
}

export type PromotionResult = { promoted: number; graduated: number; sectionsCreated: number };

// ponytail: no capacity enforcement during bulk promotion — every returning
// student in a section gets a seat in the equivalent next-grade section by
// design (unlike the manual enrollment wizard's capacity check). Add a check
// here if oversubscription from merged/split sections becomes a real issue.
export async function runPromotion(targetAcademicYearId: string): Promise<PromotionResult | { error: string }> {
  const tenant = await getAdminTenant();

  const sourceYear = await prisma.academicYear.findFirst({ where: { tenantId: tenant.id, isActive: true } });
  if (!sourceYear) return { error: STABLE_ERROR.INVALID_TARGET };

  const targetYear = await prisma.academicYear.findFirst({ where: { id: targetAcademicYearId, tenantId: tenant.id } });
  if (!targetYear || targetYear.id === sourceYear.id) return { error: STABLE_ERROR.INVALID_TARGET };

  const gradeLevels = await prisma.gradeLevel.findMany({ where: { tenantId: tenant.id }, orderBy: { sortOrder: 'asc' } });

  const sections = await prisma.section.findMany({
    where: { tenantId: tenant.id, academicYearId: sourceYear.id },
    include: {
      gradeLevel: true,
      enrollments: { where: { status: { in: ['enrolled', 'reenrolled'] } } },
    },
  });

  let promoted = 0;
  let graduated = 0;
  let sectionsCreated = 0;

  for (const section of sections) {
    if (section.enrollments.length === 0) continue;

    const idx = gradeLevels.findIndex((g) => g.id === section.gradeLevelId);
    const nextGradeLevel = idx >= 0 ? gradeLevels[idx + 1] : undefined;

    if (!nextGradeLevel) {
      await prisma.enrollment.updateMany({
        where: {
          tenantId: tenant.id,
          academicYearId: sourceYear.id,
          sectionId: section.id,
          status: { in: ['enrolled', 'reenrolled'] },
        },
        data: { status: 'graduated' },
      });
      graduated += section.enrollments.length;
      continue;
    }

    let targetSection = await prisma.section.findFirst({
      where: { tenantId: tenant.id, academicYearId: targetYear.id, gradeLevelId: nextGradeLevel.id, name: section.name },
    });
    if (!targetSection) {
      targetSection = await prisma.section.create({
        data: {
          tenantId: tenant.id,
          academicYearId: targetYear.id,
          gradeLevelId: nextGradeLevel.id,
          name: section.name,
          capacity: section.capacity,
        },
      });
      sectionsCreated++;
    }

    for (const enrollment of section.enrollments) {
      await prisma.enrollment.upsert({
        where: {
          tenantId_studentId_academicYearId: { tenantId: tenant.id, studentId: enrollment.studentId, academicYearId: targetYear.id },
        },
        update: { sectionId: targetSection.id, status: 'reenrolled' },
        create: {
          tenantId: tenant.id,
          studentId: enrollment.studentId,
          sectionId: targetSection.id,
          academicYearId: targetYear.id,
          status: 'reenrolled',
        },
      });
      promoted++;
    }
  }

  await prisma.$transaction([
    prisma.academicYear.updateMany({ where: { tenantId: tenant.id }, data: { isActive: false } }),
    prisma.academicYear.update({ where: { id: targetYear.id }, data: { isActive: true } }),
  ]);

  safeRevalidate('/admin/academic');
  safeRevalidate('/admin/enrollment');

  return { promoted, graduated, sectionsCreated };
}
