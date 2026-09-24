'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

const ALLOWED_ATTENDANCE_STATUSES = new Set(['present', 'absent', 'late', 'excused'] as const);
type AllowedAttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

type AttendanceWriteContext = {
  userId: string;
  roles: string[];
  staffId?: string | null;
  tenantId: string;
};

function normalizeDate(dateIso: string) {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) {
    throw new Error('INVALID_ATTENDANCE_DATE');
  }
  date.setHours(0, 0, 0, 0);
  return date;
}

function sanitizeStatus(status: string): AllowedAttendanceStatus {
  if (ALLOWED_ATTENDANCE_STATUSES.has(status as AllowedAttendanceStatus)) {
    return status as AllowedAttendanceStatus;
  }
  throw new Error('INVALID_ATTENDANCE_STATUS');
}

function sanitizeRecords(records: { studentId: string; status: string; note?: string }[]) {
  return records.map((record) => ({
    studentId: record.studentId,
    status: sanitizeStatus(record.status),
    note: record.note,
  }));
}

async function getAttendanceWriteContext(tenantSlug?: string): Promise<AttendanceWriteContext> {
  const authSession = await auth();
  if (!authSession?.user) throw new Error('Unauthorized');

  const tenant = await prisma.tenant.findUnique({ where: { slug: authSession.user.tenantSlug ?? tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  // ponytail: session never carries staffId (not set by auth.ts), so resolve it
  // from the Staff table each call instead of trusting a field that's always undefined.
  const staff = await prisma.staff.findFirst({
    where: { tenantId: tenant.id, userId: authSession.user.id },
  });

  return {
    userId: authSession.user.id,
    roles: Array.isArray((authSession.user as { roles?: string[] }).roles)
      ? (authSession.user as { roles?: string[] }).roles ?? []
      : [],
    staffId: staff?.id ?? null,
    tenantId: tenant.id,
  };
}

function getPrimaryAttendanceRole(roles: string[]) {
  const normalizedRoles = roles.map((role) => String(role).toLowerCase());
  if (normalizedRoles.includes('admin')) return 'admin';
  if (normalizedRoles.includes('teacher')) return 'teacher';
  return null;
}

function assertRoleCanWriteAttendance(roles: string[]) {
  const normalized = getPrimaryAttendanceRole(roles);
  if (normalized === 'admin' || normalized === 'teacher') {
    return;
  }
  throw new Error('UNAUTHORIZED_SCOPE');
}

function assertTeacherOwnership(role: string | null | undefined, staffId: string | null | undefined, expectedStaffId?: string | null) {
  if (role !== 'teacher') return;
  if (!staffId || !expectedStaffId || staffId !== expectedStaffId) {
    throw new Error('UNAUTHORIZED_SCOPE');
  }
}

function assertTenantScope(resourceTenantId?: string | null, tenantId?: string) {
  if (!resourceTenantId || !tenantId || resourceTenantId !== tenantId) {
    throw new Error('TENANT_SCOPE_VIOLATION');
  }
}

// ─── Teacher-facing actions (by sectionSubjectId) ─────────────────────────────

export async function getAttendanceSession(sectionSubjectId: string, dateIso: string, tenantSlug?: string) {
  const authSession = await auth();
  if (!authSession?.user) throw new Error('Unauthorized');
  tenantSlug = authSession.user.tenantSlug;

  if (!sectionSubjectId?.trim()) throw new Error('sectionSubjectId requerido');

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const ss = await prisma.sectionSubject.findUnique({
    where: { id: sectionSubjectId },
    include: {
      section: {
        include: { enrollments: { where: { status: 'enrolled' }, include: { student: true } } }
      }
    }
  });

  if (!ss) throw new Error('Clase no encontrada');

  const date = normalizeDate(dateIso);

  const session = await prisma.attendanceSession.findFirst({
    where: { sectionId: ss.sectionId, date },
    include: { records: { include: { student: true } } }
  });

  if (session) {
    return {
      session: { id: session.id, date: session.date.toISOString() },
      records: session.records.map(r => ({
        studentId: r.studentId,
        studentName: `${r.student.firstName} ${r.student.lastName}`,
        status: r.status,
        note: r.note
      }))
    };
  }

  return {
    session: null,
    records: ss.section.enrollments.map(e => ({
      studentId: e.student.id,
      studentName: `${e.student.firstName} ${e.student.lastName}`,
      status: null,
      note: null
    }))
  };
}

export async function saveAttendanceSession(
  sectionSubjectId: string,
  dateIso: string,
  records: { studentId: string; status: string; note?: string }[],
  tenantSlug?: string
) {
  if (!sectionSubjectId?.trim()) throw new Error('sectionSubjectId requerido');

  const context = await getAttendanceWriteContext(tenantSlug);
  assertRoleCanWriteAttendance(context.roles);
  const primaryRole = getPrimaryAttendanceRole(context.roles);

  const ss = await prisma.sectionSubject.findUnique({ where: { id: sectionSubjectId } });
  if (!ss) throw new Error('Clase no encontrada');

  assertTenantScope(ss.tenantId, context.tenantId);
  assertTeacherOwnership(primaryRole, context.staffId, ss.staffId);

  const date = normalizeDate(dateIso);
  const normalizedRecords = sanitizeRecords(records);

  return await prisma.$transaction(async (tx) => {
    const session = await tx.attendanceSession.upsert({
      where: {
        tenantId_sectionId_date: {
          tenantId: context.tenantId,
          sectionId: ss.sectionId,
          date
        }
      },
      update: { takenById: context.userId },
      create: {
        tenantId: context.tenantId,
        sectionId: ss.sectionId,
        date,
        takenById: context.userId
      }
    });

    for (const r of normalizedRecords) {
      await tx.attendanceRecord.upsert({
        where: {
          tenantId_attendanceSessionId_studentId: {
            tenantId: context.tenantId,
            attendanceSessionId: session.id,
            studentId: r.studentId
          }
        },
        update: { status: r.status, note: r.note },
        create: {
          tenantId: context.tenantId,
          attendanceSessionId: session.id,
          studentId: r.studentId,
          status: r.status,
          note: r.note
        }
      });
    }

    await tx.activityEvent.create({
      data: {
        tenantId: context.tenantId,
        actorUserId: context.userId,
        action: 'attendance.taken',
        entityType: 'attendance',
        entityId: session.id,
        metadata: JSON.stringify({
          mode: 'section-subject',
          sectionSubjectId,
          sectionId: ss.sectionId,
          dateIso,
          recordCount: normalizedRecords.length,
          statuses: normalizedRecords.reduce<Record<string, number>>((acc, item) => {
            acc[item.status] = (acc[item.status] ?? 0) + 1;
            return acc;
          }, {})
        })
      }
    });

    revalidatePath(`/teacher/classes/${sectionSubjectId}`);
    return { success: true };
  });
}

// ─── Admin-facing actions (by sectionId) ─────────────────────────────────────

/**
 * Returns the active academic year's sections with grade info.
 */
export async function getSectionsForAttendance(tenantSlug?: string) {
  const authSession = await auth();
  if (!authSession?.user) throw new Error('Unauthorized');
  tenantSlug = authSession.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const academicYear = await prisma.academicYear.findFirst({
    where: { tenantId: tenant.id, isActive: true },
  });
  if (!academicYear) throw new Error('No active academic year');

  const sections = await prisma.section.findMany({
    where: { tenantId: tenant.id, academicYearId: academicYear.id },
    include: {
      gradeLevel: { select: { id: true, name: true } },
      enrollments: { where: { status: 'enrolled' }, select: { id: true } }
    },
    orderBy: [{ gradeLevel: { name: 'asc' } }, { name: 'asc' }]
  });

  return sections.map(s => ({
    id: s.id,
    name: s.name,
    gradeLevelId: s.gradeLevelId,
    gradeLevelName: s.gradeLevel.name,
    enrolledCount: s.enrollments.length,
  }));
}

/**
 * Returns enrolled students in a section with their attendance status for a given date.
 */
export async function getAttendanceBySectionDate(
  sectionId: string,
  dateIso: string,
  tenantSlug?: string
) {
  const authSession = await auth();
  if (!authSession?.user) throw new Error('Unauthorized');
  tenantSlug = authSession.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const date = normalizeDate(dateIso);

  const enrollments = await prisma.enrollment.findMany({
    where: { sectionId, status: 'enrolled', tenantId: tenant.id },
    include: { student: true },
    orderBy: { student: { lastName: 'asc' } }
  });

  const session = await prisma.attendanceSession.findFirst({
    where: { tenantId: tenant.id, sectionId, date },
    include: { records: true, takenBy: { select: { fullName: true, roles: { where: { tenantId: tenant.id }, select: { role: { select: { name: true } } }, take: 1 } } } }
  });

  const recordMap = new Map(session?.records.map(r => [r.studentId, r]) ?? []);

  return {
    sessionId: session?.id ?? null,
    takenBy: session?.takenBy
      ? { name: session.takenBy.fullName, role: session.takenBy.roles[0]?.role.name ?? null }
      : null,
    records: enrollments.map(e => ({
      studentId: e.student.id,
      studentName: `${e.student.firstName} ${e.student.lastName}`,
      studentCode: e.student.studentCode,
      status: recordMap.get(e.student.id)?.status ?? null,
      note: recordMap.get(e.student.id)?.note ?? null,
    }))
  };
}

/**
 * Saves attendance for an entire section on a given date (admin flow).
 */
export async function saveAttendanceBySectionDate(
  sectionId: string,
  dateIso: string,
  records: { studentId: string; status: string; note?: string }[],
  tenantSlug?: string
) {
  const context = await getAttendanceWriteContext(tenantSlug);
  assertRoleCanWriteAttendance(context.roles);

  const section = await prisma.section.findUnique({ where: { id: sectionId }, select: { id: true, tenantId: true } });
  if (!section) throw new Error('SECTION_NOT_FOUND');
  assertTenantScope(section.tenantId, context.tenantId);

  const date = normalizeDate(dateIso);
  const normalizedRecords = sanitizeRecords(records);

  return await prisma.$transaction(async (tx) => {
    const session = await tx.attendanceSession.upsert({
      where: { tenantId_sectionId_date: { tenantId: context.tenantId, sectionId, date } },
      update: { takenById: context.userId },
      create: { tenantId: context.tenantId, sectionId, date, takenById: context.userId }
    });

    for (const r of normalizedRecords) {
      await tx.attendanceRecord.upsert({
        where: {
          tenantId_attendanceSessionId_studentId: {
            tenantId: context.tenantId,
            attendanceSessionId: session.id,
            studentId: r.studentId
          }
        },
        update: { status: r.status, note: r.note },
        create: {
          tenantId: context.tenantId,
          attendanceSessionId: session.id,
          studentId: r.studentId,
          status: r.status,
          note: r.note ?? null
        }
      });
    }

    await tx.activityEvent.create({
      data: {
        tenantId: context.tenantId,
        actorUserId: context.userId,
        action: 'attendance.taken',
        entityType: 'attendance',
        entityId: session.id,
        metadata: JSON.stringify({
          mode: 'section',
          sectionId,
          dateIso,
          recordCount: normalizedRecords.length,
          statuses: normalizedRecords.reduce<Record<string, number>>((acc, item) => {
            acc[item.status] = (acc[item.status] ?? 0) + 1;
            return acc;
          }, {})
        })
      }
    });

    revalidatePath('/admin/attendance');
    return { success: true, sessionId: session.id };
  });
}

/**
 * Returns monthly attendance summary for a specific student.
 * Used in the student record's Attendance tab.
 */
export async function getStudentAttendanceSummary(studentId: string, tenantSlug?: string) {
  const authSession = await auth();
  if (!authSession?.user) throw new Error('Unauthorized');
  tenantSlug = authSession.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const rawRecords = await prisma.attendanceRecord.findMany({
    where: { tenantId: tenant.id, studentId },
    include: {
      attendanceSession: { select: { date: true, sectionId: true } }
    },
    orderBy: { attendanceSession: { date: 'desc' } }
  });

  // Group by month
  const byMonth: Record<string, { month: string; present: number; absent: number; late: number; excused: number; total: number }> = {};
  const bySection: Record<string, { present: number; absent: number; late: number; excused: number; total: number }> = {};

  for (const r of rawRecords) {
    const d = r.attendanceSession.date;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!byMonth[key]) {
      byMonth[key] = {
        month: d.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }),
        present: 0, absent: 0, late: 0, excused: 0, total: 0
      };
    }
    byMonth[key].total++;
    if (r.status === 'present') byMonth[key].present++;
    else if (r.status === 'absent') byMonth[key].absent++;
    else if (r.status === 'late') byMonth[key].late++;
    else if (r.status === 'excused') byMonth[key].excused++;

    const sectionKey = r.attendanceSession.sectionId;
    if (!bySection[sectionKey]) {
      bySection[sectionKey] = { present: 0, absent: 0, late: 0, excused: 0, total: 0 };
    }
    bySection[sectionKey].total++;
    if (r.status === 'present') bySection[sectionKey].present++;
    else if (r.status === 'absent') bySection[sectionKey].absent++;
    else if (r.status === 'late') bySection[sectionKey].late++;
    else if (r.status === 'excused') bySection[sectionKey].excused++;
  }

  const totalPresent = rawRecords.filter(r => r.status === 'present').length;
  const totalRecords = rawRecords.length;

  return {
    overallPct: totalRecords > 0 ? Math.round((totalPresent / totalRecords) * 100) : null,
    totalDays: totalRecords,
    totalPresent,
    totalAbsent: rawRecords.filter(r => r.status === 'absent').length,
    recentRecords: rawRecords.slice(0, 30).map(r => ({
      date: r.attendanceSession.date.toISOString(),
      status: r.status,
      note: r.note,
    })),
    byMonth: Object.values(byMonth),
    bySection,
  };
}
