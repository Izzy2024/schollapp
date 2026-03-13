'use server';

import { auth } from '@/auth';

import prisma from '@/lib/prisma';

export async function getAdminDashboardStats(tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  
  if (!tenant) throw new Error('Tenant not found');

  const studentsCount = await prisma.student.count({
    where: { tenantId: tenant.id, status: 'active' },
  });

  const teachersCount = await prisma.staff.count({
    where: { tenantId: tenant.id, isActive: true },
  });

  const activeYear = await prisma.academicYear.findFirst({
    where: { tenantId: tenant.id, isActive: true }
  });

  const sectionsCount = activeYear 
    ? await prisma.section.count({ where: { tenantId: tenant.id, academicYearId: activeYear.id } })
    : 0;

  const pendingRequestsCount = await prisma.classRequest.count({
    where: { tenantId: tenant.id, status: 'pending' },
  });

  // Today's attendance
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const totalRecordsToday = await prisma.attendanceRecord.count({
    where: {
      tenantId: tenant.id,
      attendanceSession: {
        date: { gte: startOfToday, lte: endOfToday }
      }
    }
  });

  const presentRecordsToday = await prisma.attendanceRecord.count({
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

  const recentActivitiesRaw = await prisma.activityEvent.findMany({
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
    recentActivities,
  };
}
