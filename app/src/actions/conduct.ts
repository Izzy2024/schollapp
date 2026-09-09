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

type Session = {
  id: string;
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

function isAdminOrDirector(session: Session): boolean {
  const roles = session.roles ?? [];
  return roles.includes('admin') || roles.includes('director');
}

async function findTeacherStaffId(tenantId: string, userId: string): Promise<string | null> {
  const staff = await prisma.staff.findFirst({ where: { tenantId, userId } });
  return staff?.id ?? null;
}

async function isTeacherOfStudent(tenantId: string, staffId: string, studentId: string): Promise<boolean> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { tenantId, studentId, status: { in: ['enrolled', 'reenrolled'] } },
  });
  if (!enrollment) return false;

  const teaches = await prisma.sectionSubject.findFirst({
    where: { tenantId, staffId, sectionId: enrollment.sectionId },
  });
  return teaches !== null;
}

/** Admin/director: any student. Teacher: only students in one of their classes. Student: only themself. Guardian: only their linked children. */
async function assertConductAccess(tenantId: string, studentId: string, session: Session): Promise<void> {
  if (isAdminOrDirector(session)) return;

  const staffId = await findTeacherStaffId(tenantId, session.id);
  if (staffId && (await isTeacherOfStudent(tenantId, staffId, studentId))) return;

  const student = await prisma.student.findFirst({ where: { id: studentId, tenantId } });
  if (student?.email && student.email === session.email) return;

  const guardian = session.email ? await prisma.guardian.findFirst({ where: { tenantId, email: session.email } }) : null;
  if (guardian) {
    const link = await prisma.studentGuardian.findUnique({
      where: { tenantId_studentId_guardianId: { tenantId, studentId, guardianId: guardian.id } },
    });
    if (link) return;
  }

  throw stableError(STABLE_ERROR.CONDUCT_FORBIDDEN);
}

export type ConductRecordRow = {
  id: string;
  type: string;
  category: string | null;
  description: string;
  points: number;
  occurredAt: string;
  reportedByName: string | null;
};

export async function getStudentConductRecords(studentId: string): Promise<{ records: ConductRecordRow[]; totalPoints: number }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenant = await getTenant(session.user);
  await assertConductAccess(tenant.id, studentId, session.user);

  const records = await prisma.conductRecord.findMany({
    where: { tenantId: tenant.id, studentId },
    include: { reportedBy: { select: { fullName: true } } },
    orderBy: { occurredAt: 'desc' },
  });

  return {
    records: records.map((r) => ({
      id: r.id,
      type: r.type,
      category: r.category,
      description: r.description,
      points: r.points,
      occurredAt: r.occurredAt.toISOString(),
      reportedByName: r.reportedBy?.fullName ?? null,
    })),
    totalPoints: records.reduce((sum, r) => sum + r.points, 0),
  };
}

export async function createConductRecord(
  studentId: string,
  data: { type: 'merit' | 'demerit' | 'incident'; category?: string; description: string; points: number; occurredAtIso?: string }
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenant = await getTenant(session.user);

  const roles = session.user.roles ?? [];
  const staffId = await findTeacherStaffId(tenant.id, session.user.id);

  const canReport =
    isAdminOrDirector(session.user) || (roles.includes('teacher') && staffId && (await isTeacherOfStudent(tenant.id, staffId, studentId)));
  if (!canReport) throw stableError(STABLE_ERROR.CONDUCT_FORBIDDEN);

  if (!data.description.trim()) {
    return { error: STABLE_ERROR.INVALID_TARGET };
  }

  await prisma.conductRecord.create({
    data: {
      tenantId: tenant.id,
      studentId,
      reportedById: staffId ?? undefined,
      type: data.type,
      category: data.category,
      description: data.description.trim(),
      points: data.points,
      occurredAt: data.occurredAtIso ? new Date(data.occurredAtIso) : new Date(),
    },
  });

  safeRevalidate('/admin/students');
  safeRevalidate('/teacher/conduct');
  return { success: true };
}

export async function deleteConductRecord(recordId: string): Promise<{ success: true }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenant = await getTenant(session.user);
  if (!isAdminOrDirector(session.user)) throw stableError(STABLE_ERROR.CONDUCT_FORBIDDEN);

  const record = await prisma.conductRecord.findFirst({ where: { id: recordId, tenantId: tenant.id } });
  if (!record) throw stableError(STABLE_ERROR.CONDUCT_RECORD_NOT_FOUND);

  await prisma.conductRecord.delete({ where: { id: recordId } });

  safeRevalidate('/admin/students');
  return { success: true };
}
