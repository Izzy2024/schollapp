'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { STABLE_ERROR, stableError } from '@/lib/errors';

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

  const roles = session.user.roles ?? [];
  if (!roles.includes('admin') && !roles.includes('director')) {
    throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: session.user.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  return tenant;
}

// --- Public (no session): the application form itself ---

export async function getPublicApplicationInfo(tenantSlug: string) {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug }, select: { id: true, name: true, logoUrl: true } });
  if (!tenant) return null;

  const gradeLevels = await prisma.gradeLevel.findMany({
    where: { tenantId: tenant.id },
    orderBy: { sortOrder: 'asc' },
    select: { id: true, name: true },
  });

  return { tenantName: tenant.name, logoUrl: tenant.logoUrl, gradeLevels };
}

export async function submitApplication(
  tenantSlug: string,
  data: {
    firstName: string;
    lastName: string;
    dob?: string;
    gradeLevelId?: string;
    guardianName?: string;
    guardianEmail?: string;
    guardianPhone?: string;
    notes?: string;
  }
): Promise<{ success: true } | { error: string }> {
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) return { error: STABLE_ERROR.TENANT_NOT_FOUND };

  if (!data.firstName.trim() || !data.lastName.trim()) {
    return { error: STABLE_ERROR.INVALID_TARGET };
  }

  await prisma.applicant.create({
    data: {
      tenantId: tenant.id,
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      dob: data.dob ? new Date(data.dob) : undefined,
      gradeLevelId: data.gradeLevelId || undefined,
      guardianName: data.guardianName,
      guardianEmail: data.guardianEmail,
      guardianPhone: data.guardianPhone,
      notes: data.notes,
    },
  });

  return { success: true };
}

// --- Admin/director: manage the pipeline ---

export type ApplicantRow = {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevelName: string | null;
  guardianName: string | null;
  guardianEmail: string | null;
  guardianPhone: string | null;
  status: string;
  examScore: number | null;
  notes: string | null;
  createdAt: string;
};

export async function getApplicants(status?: string): Promise<ApplicantRow[]> {
  const tenant = await getAdminTenant();

  const applicants = await prisma.applicant.findMany({
    where: { tenantId: tenant.id, ...(status ? { status } : {}) },
    include: { gradeLevel: true },
    orderBy: { createdAt: 'desc' },
  });

  return applicants.map((a) => ({
    id: a.id,
    firstName: a.firstName,
    lastName: a.lastName,
    gradeLevelName: a.gradeLevel?.name ?? null,
    guardianName: a.guardianName,
    guardianEmail: a.guardianEmail,
    guardianPhone: a.guardianPhone,
    status: a.status,
    examScore: a.examScore,
    notes: a.notes,
    createdAt: a.createdAt.toISOString(),
  }));
}

export async function recordExamResult(applicantId: string, examScore: number, passed: boolean): Promise<{ success: true }> {
  const tenant = await getAdminTenant();

  const applicant = await prisma.applicant.findFirst({ where: { id: applicantId, tenantId: tenant.id } });
  if (!applicant) throw stableError(STABLE_ERROR.APPLICANT_NOT_FOUND);

  await prisma.applicant.update({
    where: { id: applicantId },
    data: { examScore, status: passed ? 'exam_passed' : 'exam_failed' },
  });

  safeRevalidate('/admin/admissions');
  return { success: true };
}

export async function decideApplicant(applicantId: string, decision: 'accepted' | 'rejected'): Promise<{ success: true }> {
  const tenant = await getAdminTenant();

  const applicant = await prisma.applicant.findFirst({ where: { id: applicantId, tenantId: tenant.id } });
  if (!applicant) throw stableError(STABLE_ERROR.APPLICANT_NOT_FOUND);

  await prisma.applicant.update({ where: { id: applicantId }, data: { status: decision } });

  safeRevalidate('/admin/admissions');
  return { success: true };
}

export async function convertApplicantToStudent(applicantId: string): Promise<{ success: true; studentId: string } | { error: string }> {
  const tenant = await getAdminTenant();

  const applicant = await prisma.applicant.findFirst({ where: { id: applicantId, tenantId: tenant.id } });
  if (!applicant) return { error: STABLE_ERROR.APPLICANT_NOT_FOUND };
  if (applicant.convertedStudentId) return { error: STABLE_ERROR.APPLICANT_ALREADY_CONVERTED };

  const student = await prisma.$transaction(async (tx) => {
    const created = await tx.student.create({
      data: {
        tenantId: tenant.id,
        firstName: applicant.firstName,
        lastName: applicant.lastName,
        dob: applicant.dob,
        status: 'active',
      },
    });

    await tx.applicant.update({
      where: { id: applicantId },
      data: { status: 'enrolled', convertedStudentId: created.id },
    });

    if (applicant.guardianName) {
      const guardian = await tx.guardian.create({
        data: {
          tenantId: tenant.id,
          fullName: applicant.guardianName,
          email: applicant.guardianEmail,
          phone: applicant.guardianPhone,
        },
      });
      await tx.studentGuardian.create({
        data: { tenantId: tenant.id, studentId: created.id, guardianId: guardian.id, isPrimary: true },
      });
    }

    return created;
  });

  safeRevalidate('/admin/admissions');
  safeRevalidate('/admin/students');
  return { success: true, studentId: student.id };
}
