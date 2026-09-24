'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { STABLE_ERROR, stableError } from '@/lib/errors';

type Session = {
  email?: string | null;
  tenantSlug?: string | null;
  roles?: string[] | null;
};

async function getTenant(session: Session) {
  if (!session.tenantSlug) throw new Error('Tenant not found');
  const tenant = await prisma.tenant.findUnique({ where: { slug: session.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');
  return tenant;
}

// ponytail: revalidatePath needs a Next.js request context; contract tests run
// this action outside one, so failures here are swallowed (cache staleness, not correctness).
function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // no-op outside a Next.js request context (e.g. tests)
  }
}

function isAdminOrDirector(session: Session): boolean {
  const roles = session.roles ?? [];
  return roles.includes('admin') || roles.includes('director');
}

/** Confirms the session may view/generate the given student's report card: admin/director, the student themself, or one of their guardians. */
async function assertReportCardAccess(tenantId: string, studentId: string, session: Session): Promise<void> {
  if (isAdminOrDirector(session)) return;

  const student = await prisma.student.findFirst({ where: { id: studentId, tenantId } });
  if (student?.email && student.email === session.email) return;

  const guardian = session.email
    ? await prisma.guardian.findFirst({ where: { tenantId, email: session.email } })
    : null;
  if (guardian) {
    const link = await prisma.studentGuardian.findUnique({
      where: { tenantId_studentId_guardianId: { tenantId, studentId, guardianId: guardian.id } },
    });
    if (link) return;
  }

  throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
}

export async function getTermsForTenant() {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenant = await getTenant(session.user);

  const terms = await prisma.term.findMany({ where: { tenantId: tenant.id }, orderBy: { startDate: 'asc' } });
  return terms.map((t) => ({ id: t.id, name: t.name }));
}

export async function getGradeWeights() {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  if (!isAdminOrDirector(session.user)) throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);

  const tenant = await getTenant(session.user);
  const weights = await prisma.gradeWeightConfig.findMany({ where: { tenantId: tenant.id }, orderBy: { type: 'asc' } });
  return weights.map((w) => ({ type: w.type, weightPercent: w.weightPercent }));
}

export async function setGradeWeights(weights: Array<{ type: string; weightPercent: number }>) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  if (!isAdminOrDirector(session.user)) throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);

  const total = weights.reduce((sum, w) => sum + w.weightPercent, 0);
  if (weights.length > 0 && total !== 100) {
    throw new Error('Los porcentajes deben sumar 100');
  }

  const tenant = await getTenant(session.user);

  await prisma.$transaction([
    prisma.gradeWeightConfig.deleteMany({ where: { tenantId: tenant.id } }),
    ...weights.map((w) =>
      prisma.gradeWeightConfig.create({
        data: { tenantId: tenant.id, type: w.type, weightPercent: w.weightPercent },
      })
    ),
  ]);

  safeRevalidate('/admin/settings/grade-weights');
  return { success: true };
}

type SubjectReportRow = {
  sectionSubjectId: string;
  subjectName: string;
  teacherName: string;
  typeAverages: Array<{ type: string; averagePercent: number }>;
  finalAveragePercent: number | null;
};

export type ReportCard = {
  studentName: string;
  studentCode: string | null;
  gradeLevelName: string | null;
  sectionName: string | null;
  termName: string;
  subjects: SubjectReportRow[];
  overallAveragePercent: number | null;
};

async function computeReportCard(tenantId: string, studentId: string, termId: string): Promise<ReportCard> {
  const student = await prisma.student.findFirst({ where: { id: studentId, tenantId } });
  if (!student) throw stableError(STABLE_ERROR.INVALID_TARGET);

  const term = await prisma.term.findFirst({ where: { id: termId, tenantId } });
  if (!term) throw stableError(STABLE_ERROR.INVALID_TARGET);

  const enrollment = await prisma.enrollment.findFirst({
    where: { tenantId, studentId, status: { in: ['enrolled', 'reenrolled'] } },
    include: { section: { include: { gradeLevel: true } } },
  });

  const weightRows = await prisma.gradeWeightConfig.findMany({ where: { tenantId } });
  const weightByType = new Map(weightRows.map((w) => [w.type, w.weightPercent]));

  const sectionSubjects = enrollment
    ? await prisma.sectionSubject.findMany({
        where: { tenantId, sectionId: enrollment.sectionId },
        include: {
          subject: true,
          staff: { select: { fullName: true } },
          evaluations: {
            where: { termId },
            include: { records: { where: { studentId } } },
          },
        },
      })
    : [];

  const subjects: SubjectReportRow[] = sectionSubjects.map((ss) => {
    const byType = new Map<string, number[]>();
    for (const ev of ss.evaluations) {
      const record = ev.records[0];
      if (!record) continue;
      const percent = (record.score / ev.maxScore) * 100;
      const list = byType.get(ev.type) ?? [];
      list.push(percent);
      byType.set(ev.type, list);
    }

    const typeAverages = Array.from(byType.entries()).map(([type, percents]) => ({
      type,
      averagePercent: percents.reduce((a, b) => a + b, 0) / percents.length,
    }));

    let finalAveragePercent: number | null = null;
    if (typeAverages.length > 0) {
      const hasConfiguredWeights = typeAverages.some((t) => weightByType.has(t.type));
      if (hasConfiguredWeights) {
        const totalWeight = typeAverages.reduce((sum, t) => sum + (weightByType.get(t.type) ?? 0), 0);
        finalAveragePercent =
          totalWeight > 0
            ? typeAverages.reduce((sum, t) => sum + t.averagePercent * (weightByType.get(t.type) ?? 0), 0) / totalWeight
            : null;
      } else {
        finalAveragePercent = typeAverages.reduce((sum, t) => sum + t.averagePercent, 0) / typeAverages.length;
      }
    }

    return {
      sectionSubjectId: ss.id,
      subjectName: ss.subject.name,
      teacherName: ss.staff?.fullName ?? 'Sin asignar',
      typeAverages: typeAverages.map((t) => ({ type: t.type, averagePercent: Math.round(t.averagePercent * 10) / 10 })),
      finalAveragePercent: finalAveragePercent === null ? null : Math.round(finalAveragePercent * 10) / 10,
    };
  });

  const gradedSubjects = subjects.filter((s) => s.finalAveragePercent !== null);
  const overallAveragePercent =
    gradedSubjects.length > 0
      ? Math.round((gradedSubjects.reduce((sum, s) => sum + (s.finalAveragePercent ?? 0), 0) / gradedSubjects.length) * 10) / 10
      : null;

  return {
    studentName: `${student.firstName} ${student.lastName}`,
    studentCode: student.studentCode,
    gradeLevelName: enrollment?.section.gradeLevel.name ?? null,
    sectionName: enrollment?.section.name ?? null,
    termName: term.name,
    subjects,
    overallAveragePercent,
  };
}

export async function getStudentReportCard(studentId: string, termId: string): Promise<ReportCard> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenant = await getTenant(session.user);
  await assertReportCardAccess(tenant.id, studentId, session.user);

  return computeReportCard(tenant.id, studentId, termId);
}

export async function getMyReportCard(termId: string): Promise<ReportCard | null> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenant = await getTenant(session.user);
  const student = await prisma.student.findFirst({
    where: { tenantId: tenant.id, email: session.user.email ?? undefined, status: 'active' },
  });
  if (!student) return null;

  return computeReportCard(tenant.id, student.id, termId);
}

export async function generateReportCardPdf(studentId: string, termId: string): Promise<Buffer> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenant = await getTenant(session.user);
  await assertReportCardAccess(tenant.id, studentId, session.user);

  const reportCard = await computeReportCard(tenant.id, studentId, termId);

  const { renderToStream } = await import('@react-pdf/renderer');
  const { default: ReportCardPDF } = await import('@/lib/pdf/report-card-template');

  const stream = await renderToStream(
    <ReportCardPDF data={{ ...reportCard, schoolName: tenant.name }} />
  );

  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
