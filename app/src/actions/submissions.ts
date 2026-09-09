'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import { getStorageAdapter } from '@/lib/storage';

// ponytail: revalidatePath needs a Next.js request context; contract tests run
// this action outside one, so failures here are swallowed (cache staleness, not correctness).
function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // no-op outside a Next.js request context (e.g. tests)
  }
}

async function getTenantAndStudent(session: { tenantSlug?: string | null; email?: string | null }) {
  if (!session.tenantSlug) throw new Error('Tenant not found');
  const tenant = await prisma.tenant.findUnique({ where: { slug: session.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const student = await prisma.student.findFirst({
    where: { tenantId: tenant.id, email: session.email ?? undefined, status: 'active' },
  });

  return { tenant, student };
}

export type Assignment = {
  evaluationId: string;
  name: string;
  subjectName: string;
  teacherName: string;
  dueDate: string;
  maxScore: number;
  submission: { submittedAt: string | null; status: string; fileUrl: string | null; feedback: string | null } | null;
};

export async function getMyAssignments(): Promise<Assignment[]> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const { tenant, student } = await getTenantAndStudent(session.user);
  if (!student) return [];

  const enrollment = await prisma.enrollment.findFirst({
    where: { tenantId: tenant.id, studentId: student.id, status: { in: ['enrolled', 'reenrolled'] } },
  });
  if (!enrollment) return [];

  const sectionSubjects = await prisma.sectionSubject.findMany({
    where: { tenantId: tenant.id, sectionId: enrollment.sectionId },
    include: {
      subject: true,
      staff: { select: { fullName: true } },
      evaluations: {
        where: { dueDate: { not: null } },
        include: {
          submissions: { where: { studentId: student.id }, include: { attachment: true } },
        },
        orderBy: { dueDate: 'asc' },
      },
    },
  });

  return sectionSubjects.flatMap((ss) =>
    ss.evaluations.map((ev) => {
      const submission = ev.submissions[0];
      return {
        evaluationId: ev.id,
        name: ev.name,
        subjectName: ss.subject.name,
        teacherName: ss.staff?.fullName ?? 'Sin asignar',
        dueDate: ev.dueDate!.toISOString(),
        maxScore: ev.maxScore,
        submission: submission
          ? {
              submittedAt: submission.submittedAt?.toISOString() ?? null,
              status: submission.status,
              fileUrl: submission.attachment?.fileKey ?? null,
              feedback: submission.feedback,
            }
          : null,
      };
    })
  );
}

export async function submitAssignment(evaluationId: string, formData: FormData): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const { tenant, student } = await getTenantAndStudent(session.user);
  if (!student) return { error: STABLE_ERROR.SUBMISSION_FORBIDDEN };

  const evaluation = await prisma.evaluation.findFirst({ where: { id: evaluationId, tenantId: tenant.id } });
  if (!evaluation || !evaluation.dueDate) return { error: STABLE_ERROR.ASSIGNMENT_NOT_FOUND };

  const enrollment = await prisma.enrollment.findFirst({
    where: { tenantId: tenant.id, studentId: student.id, status: { in: ['enrolled', 'reenrolled'] } },
  });
  const sectionSubject = await prisma.sectionSubject.findFirst({
    where: { id: evaluation.sectionSubjectId, tenantId: tenant.id, sectionId: enrollment?.sectionId },
  });
  if (!sectionSubject) return { error: STABLE_ERROR.SUBMISSION_FORBIDDEN };

  const file = formData.get('file') as File;
  if (!file) throw new Error('Falta el archivo a entregar');

  const buffer = Buffer.from(await file.arrayBuffer());
  const storage = await getStorageAdapter();
  const stored = await storage.upload({ tenantId: tenant.id, fileName: file.name, contentType: file.type, buffer });

  const attachment = await prisma.attachment.create({
    data: {
      tenantId: tenant.id,
      ownerType: 'submission',
      ownerId: `${evaluationId}:${student.id}`,
      fileKey: stored.fileKey,
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    },
  });

  const now = new Date();
  const status = now > evaluation.dueDate ? 'late' : 'submitted';

  await prisma.submission.upsert({
    where: { tenantId_evaluationId_studentId: { tenantId: tenant.id, evaluationId, studentId: student.id } },
    update: { submittedAt: now, attachmentId: attachment.id, status },
    create: { tenantId: tenant.id, evaluationId, studentId: student.id, submittedAt: now, attachmentId: attachment.id, status },
  });

  safeRevalidate('/student/assignments');
  return { success: true };
}

async function assertTeacherOwnsEvaluation(tenantId: string, userId: string, evaluationId: string) {
  const teacher = await prisma.staff.findFirst({ where: { tenantId, userId } });
  const evaluation = await prisma.evaluation.findFirst({
    where: { id: evaluationId, tenantId },
    include: { sectionSubject: true },
  });
  if (!evaluation || !teacher || evaluation.sectionSubject.staffId !== teacher.id) {
    throw stableError(STABLE_ERROR.SUBMISSION_FORBIDDEN);
  }
  return evaluation;
}

export type TeacherAssignment = {
  evaluationId: string;
  name: string;
  subjectName: string;
  sectionName: string;
  dueDate: string;
  submittedCount: number;
  totalStudents: number;
};

export async function getMyAssignmentsAsTeacher(): Promise<TeacherAssignment[]> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenant = await prisma.tenant.findUnique({ where: { slug: session.user.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const teacher = await prisma.staff.findFirst({ where: { tenantId: tenant.id, userId: session.user.id } });
  if (!teacher) return [];

  const sectionSubjects = await prisma.sectionSubject.findMany({
    where: { tenantId: tenant.id, staffId: teacher.id },
    include: {
      subject: true,
      section: { include: { gradeLevel: true, enrollments: { where: { status: { in: ['enrolled', 'reenrolled'] } } } } },
      evaluations: { where: { dueDate: { not: null } }, include: { submissions: true }, orderBy: { dueDate: 'asc' } },
    },
  });

  return sectionSubjects.flatMap((ss) =>
    ss.evaluations.map((ev) => ({
      evaluationId: ev.id,
      name: ev.name,
      subjectName: ss.subject.name,
      sectionName: `${ss.section.gradeLevel.name} ${ss.section.name}`,
      dueDate: ev.dueDate!.toISOString(),
      submittedCount: ev.submissions.filter((s) => s.submittedAt).length,
      totalStudents: ss.section.enrollments.length,
    }))
  );
}

export type SubmissionRow = {
  submissionId: string | null;
  studentId: string;
  studentName: string;
  submittedAt: string | null;
  status: string;
  fileUrl: string | null;
  feedback: string | null;
};

export async function getSubmissionsForEvaluation(evaluationId: string): Promise<SubmissionRow[]> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenant = await prisma.tenant.findUnique({ where: { slug: session.user.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const evaluation = await assertTeacherOwnsEvaluation(tenant.id, session.user.id, evaluationId);

  const enrollments = await prisma.enrollment.findMany({
    where: { tenantId: tenant.id, sectionId: evaluation.sectionSubject.sectionId, status: { in: ['enrolled', 'reenrolled'] } },
    include: {
      student: true,
    },
  });

  const submissions = await prisma.submission.findMany({
    where: { tenantId: tenant.id, evaluationId },
    include: { attachment: true },
  });
  const byStudentId = new Map(submissions.map((s) => [s.studentId, s]));

  return enrollments
    .map((e) => {
      const submission = byStudentId.get(e.studentId);
      return {
        submissionId: submission?.id ?? null,
        studentId: e.studentId,
        studentName: `${e.student.firstName} ${e.student.lastName}`,
        submittedAt: submission?.submittedAt?.toISOString() ?? null,
        status: submission?.status ?? 'pending',
        fileUrl: submission?.attachment?.fileKey ?? null,
        feedback: submission?.feedback ?? null,
      };
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName));
}

export async function saveSubmissionFeedback(submissionId: string, feedback: string): Promise<{ success: true }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenant = await prisma.tenant.findUnique({ where: { slug: session.user.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const submission = await prisma.submission.findFirst({
    where: { id: submissionId, tenantId: tenant.id },
    include: { evaluation: { include: { sectionSubject: true } } },
  });
  if (!submission) throw stableError(STABLE_ERROR.ASSIGNMENT_NOT_FOUND);

  await assertTeacherOwnsEvaluation(tenant.id, session.user.id, submission.evaluationId);

  await prisma.submission.update({
    where: { id: submissionId },
    data: { feedback, status: 'graded' },
  });

  return { success: true };
}
