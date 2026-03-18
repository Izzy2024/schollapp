'use server';

import { auth } from '@/auth';

import prisma from '@/lib/prisma';
import { getTestPrisma } from '@/lib/test-seams';

export async function getAdminDashboardStats(tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const db: typeof prisma = (getTestPrisma<typeof prisma>() ?? prisma) as any;

  const tenant = await db.tenant.findUnique({
    where: { slug: tenantSlug },
  });

  if (!tenant) throw new Error('Tenant not found');

  const studentsCount = await db.student.count({
    where: { tenantId: tenant.id, status: 'active' },
  });

  const teachersCount = await db.staff.count({
    where: { tenantId: tenant.id, isActive: true },
  });

  const activeYear = await db.academicYear.findFirst({
    where: { tenantId: tenant.id, isActive: true }
  });

  const sectionsCount = activeYear 
    ? await db.section.count({ where: { tenantId: tenant.id, academicYearId: activeYear.id } })
    : 0;

  const pendingRequestsCount = await db.classRequest.count({
    where: { tenantId: tenant.id, status: 'pending' },
  });

  const pendingBreakdown = {
    classRequests: pendingRequestsCount,
    scheduleRequests: 0,
    announcementsToPublish: 0,
    role: (session.user as any).role ?? 'ADMIN',
    scopeTenantId: tenant.id,
  };

  // Today's attendance (UTC daily window)
  const now = new Date();
  const startOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const endOfToday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));

  const totalRecordsToday = await db.attendanceRecord.count({
    where: {
      tenantId: tenant.id,
      attendanceSession: {
        date: { gte: startOfToday, lte: endOfToday }
      }
    }
  });

  const presentRecordsToday = await db.attendanceRecord.count({
    where: {
      tenantId: tenant.id,
      status: 'present',
      attendanceSession: {
        date: { gte: startOfToday, lte: endOfToday }
      }
    }
  });

  const attendanceTodayPct = totalRecordsToday > 0 
    ? Math.round((presentRecordsToday / totalRecordsToday) * 100) 
    : null;

  const recentActivitiesRaw = await db.activityEvent.findMany({
    where: { tenantId: tenant.id },
    orderBy: { occurredAt: 'desc' },
    take: 10,
    include: { actorUser: true },
  });

  const recentActivities = recentActivitiesRaw.map(act => {
    let description = '';
    const actionMap: Record<string, string> = {
      'teacher_assigned': 'Docente asignado a clase',
      'class_request_approved': 'Solicitud de clase aprobada',
      // Add other descriptions as needed based on enum
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
  };
}
