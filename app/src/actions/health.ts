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

async function assertHealthAdmin(session: Session) {
  // ponytail: no dedicated "nurse" role exists yet; admin/director manage health
  // records for now. When RBAC granular adoption (src/lib/rbac.ts) reaches this
  // module, gate by a health:manage permission instead of role name.
  if (!isAdminOrDirector(session)) throw stableError(STABLE_ERROR.HEALTH_FORBIDDEN);
}

/** Admin/director can see any student's health info; a student can see their own; a guardian can see their linked children's. */
async function assertHealthReadAccess(tenantId: string, studentId: string, session: Session): Promise<void> {
  if (isAdminOrDirector(session)) return;

  const student = await prisma.student.findFirst({ where: { id: studentId, tenantId } });
  if (student?.email && student.email === session.email) return;

  const guardian = session.email ? await prisma.guardian.findFirst({ where: { tenantId, email: session.email } }) : null;
  if (guardian) {
    const link = await prisma.studentGuardian.findUnique({
      where: { tenantId_studentId_guardianId: { tenantId, studentId, guardianId: guardian.id } },
    });
    if (link) return;
  }

  throw stableError(STABLE_ERROR.HEALTH_FORBIDDEN);
}

export type HealthRecordData = {
  bloodType: string | null;
  allergies: string | null;
  chronicConditions: string | null;
  medications: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  notes: string | null;
};

export async function getHealthRecord(studentId: string): Promise<HealthRecordData | null> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenant = await getTenant(session.user);
  await assertHealthReadAccess(tenant.id, studentId, session.user);

  const record = await prisma.healthRecord.findUnique({ where: { studentId } });
  if (!record || record.tenantId !== tenant.id) return null;

  return {
    bloodType: record.bloodType,
    allergies: record.allergies,
    chronicConditions: record.chronicConditions,
    medications: record.medications,
    emergencyContactName: record.emergencyContactName,
    emergencyContactPhone: record.emergencyContactPhone,
    notes: record.notes,
  };
}

export async function upsertHealthRecord(studentId: string, data: Partial<HealthRecordData>): Promise<{ success: true }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertHealthAdmin(session.user);
  const tenant = await getTenant(session.user);

  await prisma.healthRecord.upsert({
    where: { studentId },
    update: data,
    create: { tenantId: tenant.id, studentId, ...data },
  });

  safeRevalidate('/admin/students');
  return { success: true };
}

export type HealthIncidentRow = {
  id: string;
  type: string;
  description: string;
  treatmentGiven: string | null;
  sentHome: boolean;
  occurredAt: string;
  reportedByName: string | null;
};

export async function getHealthIncidents(studentId: string): Promise<HealthIncidentRow[]> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenant = await getTenant(session.user);
  await assertHealthReadAccess(tenant.id, studentId, session.user);

  const incidents = await prisma.healthIncident.findMany({
    where: { tenantId: tenant.id, studentId },
    include: { reportedBy: { select: { fullName: true } } },
    orderBy: { occurredAt: 'desc' },
  });

  return incidents.map((i) => ({
    id: i.id,
    type: i.type,
    description: i.description,
    treatmentGiven: i.treatmentGiven,
    sentHome: i.sentHome,
    occurredAt: i.occurredAt.toISOString(),
    reportedByName: i.reportedBy?.fullName ?? null,
  }));
}

export async function createHealthIncident(
  studentId: string,
  data: { type: 'illness' | 'injury' | 'other'; description: string; treatmentGiven?: string; sentHome?: boolean }
): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertHealthAdmin(session.user);
  const tenant = await getTenant(session.user);

  if (!data.description.trim()) return { error: STABLE_ERROR.INVALID_TARGET };

  const staff = await prisma.staff.findFirst({ where: { tenantId: tenant.id, userId: session.user.id } });

  await prisma.healthIncident.create({
    data: {
      tenantId: tenant.id,
      studentId,
      reportedById: staff?.id,
      type: data.type,
      description: data.description.trim(),
      treatmentGiven: data.treatmentGiven,
      sentHome: data.sentHome ?? false,
    },
  });

  safeRevalidate('/admin/students');
  return { success: true };
}
