'use server';

import prisma from '@/lib/prisma';
import { getTestPrisma } from '@/lib/test-seams';
import { requireTenant } from '@/lib/authz';
import { STABLE_ERROR, stableError } from '@/lib/errors';

export async function getAdminDashboardStats(_legacyTenantSlug?: string) {
  const ctx = await requireTenant();
  if (!ctx.roles.includes('admin') && !ctx.roles.includes('director')) {
    throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
  }

  const db: typeof prisma = (getTestPrisma<typeof prisma>() ?? prisma) as any;
  const tenantId = ctx.tenantId;

  const studentsCount = await db.student.count({
    where: { tenantId, status: 'active' },
  });

  const teachersCount = await db.staff.count({
    where: { tenantId, isActive: true },
  });

  const activeYear = await db.academicYear.findFirst({
    where: { tenantId, isActive: true }
  });

  const sectionsCount = activeYear 
    ? await db.section.count({ where: { tenantId, academicYearId: activeYear.id } })
    : 0;

  const pendingRequestsCount = await db.classRequest.count({
    where: { tenantId, status: 'pending' },
  });

  const pendingBreakdown = {
    classRequests: pendingRequestsCount,
    scheduleRequests: 0,
    announcementsToPublish: 0,
    role: ctx.roles[0] ?? 'admin',
    scopeTenantId: tenantId,
  };

  // Today's attendance (UTC daily window)
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  const totalRecordsToday = await db.attendanceRecord.count({
    where: {
      tenantId,
      attendanceSession: {
        date: { gte: startOfToday, lte: endOfToday }
      }
    }
  });

  const presentRecordsToday = await db.attendanceRecord.count({
    where: {
      tenantId,
      status: 'present',
      attendanceSession: {
        date: { gte: startOfToday, lte: endOfToday }
      }
    }
  });

  const attendanceTodayPct = totalRecordsToday > 0 
    ? Math.round((presentRecordsToday / totalRecordsToday) * 100) 
    : null;

  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

  const monthCollected = await db.financePayment.aggregate({
    where: { tenantId, paidAt: { gte: startOfMonth } },
    _sum: { amountCents: true },
  });

  const overdueCharges = await db.financeCharge.findMany({
    where: { tenantId, status: 'overdue' },
    select: { amountCents: true, studentId: true },
  });
  const financeOverdueCents = overdueCharges.reduce((sum, c) => sum + c.amountCents, 0);
  const financeOverdueStudents = new Set(overdueCharges.map((c) => c.studentId)).size;

  const recentActivitiesRaw = await db.activityEvent.findMany({
    where: { tenantId },
    orderBy: { occurredAt: 'desc' },
    take: 10,
    include: { actorUser: true },
  });

  const recentActivities = recentActivitiesRaw.map(act => {
    let description = '';
    const actionMap: Record<string, string> = {
      'teacher_assigned': 'Docente asignado a clase',
      'class_request_approved': 'Solicitud de clase aprobada',
    };
    description = actionMap[act.action] || `Actividad: ${act.action}`;

    return {
      id: act.id,
      actorName: act.actorUser?.fullName || 'Sistema',
      action: act.action,
      entityType: act.entityType,
      occurredAt: act.occurredAt.toISOString(),
      description,
    };
  });

  return {
    studentsCount,
    teachersCount,
    sectionsCount,
    pendingRequestsCount,
    attendanceTodayPct,
    pendingBreakdown,
    recentActivities,
    financeCollectedThisMonthCents: monthCollected._sum.amountCents ?? 0,
    financeOverdueCents,
    financeOverdueStudents,
  };
}
