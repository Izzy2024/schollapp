'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import { hasPermission } from '@/lib/rbac';

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

export type AdmissionExamConfig = {
  id: string;
  name: string;
  weight: number;
  sortOrder: number;
  active: boolean;
};

export type ApplicantExamResultRow = {
  examId: string;
  examName: string;
  weight: number;
  score: number;
};

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
  weightedPercent: number | null;
  examResults: ApplicantExamResultRow[];
  notes: string | null;
  createdAt: string;
};

export async function getAdmissionConfig(): Promise<{ exams: AdmissionExamConfig[]; passPercent: number; tenantSlug: string; gradeLevels: { id: string; name: string }[] }> {
  const tenant = await getAdminTenant();
  const [exams, gradeLevels] = await Promise.all([
    prisma.admissionExam.findMany({
      where: { tenantId: tenant.id, active: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      select: { id: true, name: true, weight: true, sortOrder: true, active: true },
    }),
    prisma.gradeLevel.findMany({ where: { tenantId: tenant.id }, orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
  ]);

  return { exams, passPercent: tenant.admissionPassPercent, tenantSlug: tenant.slug, gradeLevels };
}

export async function createApplicantByAdmin(data: {
  firstName: string;
  lastName: string;
  dob?: string;
  gradeLevelId?: string;
  guardianName?: string;
  guardianEmail?: string;
  guardianPhone?: string;
  notes?: string;
}): Promise<{ success: true } | { error: string }> {
  const tenant = await getAdminTenant();
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

  safeRevalidate('/admin/admissions');
  return { success: true };
}

export async function saveAdmissionConfig(input: { passPercent: number; exams: Array<{ id?: string; name: string; weight: number }> }): Promise<{ success: true }> {
  const tenant = await getAdminTenant();
  if (!Number.isFinite(input.passPercent) || input.passPercent < 1 || input.passPercent > 100) {
    throw stableError(STABLE_ERROR.ADMISSION_PASS_PERCENT_INVALID);
  }
  if (!input.exams.length || input.exams.some((exam) => !exam.name.trim() || !Number.isInteger(exam.weight) || exam.weight <= 0) || input.exams.reduce((sum, exam) => sum + exam.weight, 0) !== 100) {
    throw stableError(STABLE_ERROR.ADMISSION_WEIGHTS_INVALID);
  }

  const ids = input.exams.map((exam) => exam.id).filter((id): id is string => Boolean(id));
  const existing = await prisma.admissionExam.findMany({ where: { tenantId: tenant.id } });
  if (ids.some((id) => !existing.some((exam) => exam.id === id))) {
    throw stableError(STABLE_ERROR.ADMISSION_EXAM_NOT_FOUND);
  }

  await prisma.$transaction(async (tx) => {
    await tx.admissionExam.updateMany({ where: { tenantId: tenant.id }, data: { active: false } });
    for (const [sortOrder, exam] of input.exams.entries()) {
      if (exam.id) {
        await tx.admissionExam.update({
          where: { id: exam.id },
          data: { name: exam.name.trim(), weight: exam.weight, sortOrder, active: true },
        });
      } else {
        await tx.admissionExam.create({
          data: { tenantId: tenant.id, name: exam.name.trim(), weight: exam.weight, sortOrder, active: true },
        });
      }
    }
    await tx.tenant.update({ where: { id: tenant.id }, data: { admissionPassPercent: input.passPercent } });
  });

  safeRevalidate('/admin/admissions');
  return { success: true };
}

async function getWeightedExamScore(tenantId: string, applicantId: string, activeExams: Array<{ id: string; weight: number }>) {
  const results = await prisma.applicantExamResult.findMany({ where: { tenantId, applicantId, examId: { in: activeExams.map((exam) => exam.id) } } });
  if (!results.length) return { results, weightedPercent: null, complete: false };
  const byExam = new Map(results.map((result) => [result.examId, result.score]));
  const weightedPercent = activeExams.reduce((sum, exam) => sum + (byExam.get(exam.id) ?? 0) * exam.weight, 0) / 100;
  return { results, weightedPercent, complete: results.length === activeExams.length };
}

export async function getApplicants(status?: string): Promise<ApplicantRow[]> {
  const tenant = await getAdminTenant();
  const activeExams = await prisma.admissionExam.findMany({
    where: { tenantId: tenant.id, active: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
  const applicants = await prisma.applicant.findMany({
    where: { tenantId: tenant.id, ...(status ? { status } : {}) },
    include: { gradeLevel: true, examResults: { include: { exam: true } } },
    orderBy: { createdAt: 'desc' },
  });

  return applicants.map((a) => {
    const examResults = a.examResults
      .filter((result) => result.exam.active && result.exam.tenantId === tenant.id)
      .sort((left, right) => left.exam.sortOrder - right.exam.sortOrder)
      .map((result) => ({ examId: result.examId, examName: result.exam.name, weight: result.exam.weight, score: result.score }));
    const weightedPercent = activeExams.length
      ? activeExams.reduce((sum, exam) => sum + (examResults.find((result) => result.examId === exam.id)?.score ?? 0) * exam.weight, 0) / 100
      : a.examScore;

    return {
      id: a.id,
      firstName: a.firstName,
      lastName: a.lastName,
      gradeLevelName: a.gradeLevel?.name ?? null,
      guardianName: a.guardianName,
      guardianEmail: a.guardianEmail,
      guardianPhone: a.guardianPhone,
      status: a.status,
      examScore: a.examScore,
      weightedPercent: activeExams.length && examResults.length ? weightedPercent : a.examScore,
      examResults,
      notes: a.notes,
      createdAt: a.createdAt.toISOString(),
    };
  });
}

export async function recordExamScore(applicantId: string, examId: string, score: number): Promise<{ success: true }> {
  const tenant = await getAdminTenant();
  if (!Number.isFinite(score) || score < 0 || score > 100) throw stableError(STABLE_ERROR.ADMISSION_SCORE_INVALID);

  const [applicant, exam] = await Promise.all([
    prisma.applicant.findFirst({ where: { id: applicantId, tenantId: tenant.id } }),
    prisma.admissionExam.findFirst({ where: { id: examId, tenantId: tenant.id, active: true } }),
  ]);
  if (!applicant) throw stableError(STABLE_ERROR.APPLICANT_NOT_FOUND);
  if (!exam) throw stableError(STABLE_ERROR.ADMISSION_EXAM_NOT_FOUND);

  await prisma.applicantExamResult.upsert({
    where: { applicantId_examId: { applicantId, examId } },
    create: { tenantId: tenant.id, applicantId, examId, score },
    update: { score },
  });

  const activeExams = await prisma.admissionExam.findMany({ where: { tenantId: tenant.id, active: true }, select: { id: true, weight: true } });
  const evaluation = await getWeightedExamScore(tenant.id, applicantId, activeExams);
  const data: { examScore: number; status?: string } = { examScore: evaluation.weightedPercent ?? score };
  if (evaluation.complete && ['submitted', 'exam_passed', 'exam_failed'].includes(applicant.status)) {
    data.status = data.examScore >= tenant.admissionPassPercent ? 'exam_passed' : 'exam_failed';
  }
  await prisma.applicant.update({ where: { id: applicantId }, data });

  safeRevalidate('/admin/admissions');
  return { success: true };
}

export async function recordExamResult(applicantId: string, examScore: number, passed: boolean): Promise<{ success: true }> {
  const tenant = await getAdminTenant();
  const applicant = await prisma.applicant.findFirst({ where: { id: applicantId, tenantId: tenant.id } });
  if (!applicant) throw stableError(STABLE_ERROR.APPLICANT_NOT_FOUND);
  if (!Number.isFinite(examScore) || examScore < 0 || examScore > 100) throw stableError(STABLE_ERROR.ADMISSION_SCORE_INVALID);

  await prisma.applicant.update({ where: { id: applicantId }, data: { examScore, status: passed ? 'exam_passed' : 'exam_failed' } });
  safeRevalidate('/admin/admissions');
  return { success: true };
}

export async function getAdmissionStats() {
  const tenant = await getAdminTenant();
  const applicants = await prisma.applicant.findMany({ where: { tenantId: tenant.id }, select: { status: true } });
  const byStatus: Record<string, number> = {};
  for (const applicant of applicants) byStatus[applicant.status] = (byStatus[applicant.status] ?? 0) + 1;
  const examTotal = (byStatus.exam_passed ?? 0) + (byStatus.exam_failed ?? 0) + (byStatus.accepted ?? 0) + (byStatus.rejected ?? 0) + (byStatus.enrolled ?? 0);
  const decisionTotal = (byStatus.accepted ?? 0) + (byStatus.enrolled ?? 0) + (byStatus.rejected ?? 0);
  return {
    total: applicants.length,
    byStatus,
    examPassRate: examTotal ? ((byStatus.exam_passed ?? 0) + (byStatus.accepted ?? 0) + (byStatus.enrolled ?? 0)) / examTotal * 100 : 0,
    examFailRate: examTotal ? (byStatus.exam_failed ?? 0) / examTotal * 100 : 0,
    acceptanceRate: decisionTotal ? ((byStatus.accepted ?? 0) + (byStatus.enrolled ?? 0)) / decisionTotal * 100 : 0,
    rejectionRate: decisionTotal ? (byStatus.rejected ?? 0) / decisionTotal * 100 : 0,
  };
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
    const created = await tx.student.create({ data: { tenantId: tenant.id, firstName: applicant.firstName, lastName: applicant.lastName, dob: applicant.dob, status: 'active' } });
    await tx.applicant.update({ where: { id: applicantId }, data: { status: 'enrolled', convertedStudentId: created.id } });
    if (applicant.guardianName) {
      const guardian = await tx.guardian.create({ data: { tenantId: tenant.id, fullName: applicant.guardianName, email: applicant.guardianEmail, phone: applicant.guardianPhone } });
      await tx.studentGuardian.create({ data: { tenantId: tenant.id, studentId: created.id, guardianId: guardian.id, isPrimary: true } });
    }
    return created;
  });

  safeRevalidate('/admin/admissions');
  safeRevalidate('/admin/students');
  return { success: true, studentId: student.id };
}
