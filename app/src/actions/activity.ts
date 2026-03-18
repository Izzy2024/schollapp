'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function getRecentActivities(
  tenantSlug?: string,
  filterEntityType?: string,
  page: number = 1,
  limit: number = 50
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  
  const currentTenantSlug = tenantSlug || session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: currentTenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const whereClause: any = { tenantId: tenant.id };
  
  if (filterEntityType && filterEntityType !== 'ALL') {
    whereClause.entityType = filterEntityType;
  }

  const offset = (Math.max(1, page) - 1) * limit;

  const [activities, totalCount] = await Promise.all([
    prisma.activityEvent.findMany({
      where: whereClause,
      include: { 
        actorUser: {
          select: { fullName: true }
        } 
      },
      orderBy: { occurredAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.activityEvent.count({ where: whereClause })
  ]);

  return {
    activities: activities.map(act => {
      // Logic for readable text and icon mapping
      let icon = 'history';
      let iconColor = 'text-gray-500';
      let iconBg = 'bg-gray-100';
      let text = `Acción: ${act.action} en ${act.entityType} (${act.entityId})`;
      
      const type = act.entityType?.toLowerCase() || '';
      const actionStr = act.action?.toLowerCase() || '';

      // 1. Enrollment Events
      if (type.includes('enrollment')) {
        icon = actionStr.includes('unenroll') ? 'person_remove' : 'how_to_reg';
        iconColor = actionStr.includes('unenroll') ? 'text-red-600' : 'text-green-600';
        iconBg = actionStr.includes('unenroll') ? 'bg-red-50' : 'bg-green-50';
        if (actionStr.includes('student_enrolled') || actionStr === 'created' || actionStr === 'enrolled') text = 'Inscribió a un alumno';
        if (actionStr.includes('student_unenrolled') || actionStr === 'deleted' || actionStr === 'unenrolled') text = 'Dio de baja a un alumno';
      }
      
      // 2. Announcment Events
      if (type.includes('announcement')) {
        icon = 'campaign';
        iconColor = 'text-amber-600';
        iconBg = 'bg-amber-50';
        if (actionStr.includes('created')) text = 'Creó un nuevo comunicado';
        if (actionStr.includes('published') || actionStr === 'publish') text = 'Publicó un comunicado';
        if (actionStr.includes('deleted')) text = 'Eliminó un comunicado';
      }

      // 3. User / Staff Events
      if (type.includes('user')) {
        icon = 'person_add';
        iconColor = 'text-blue-600';
        iconBg = 'bg-blue-50';
        if (actionStr.includes('created')) text = 'Registró a un nuevo usuario';
      }
      if (type.includes('staff')) {
        icon = 'badge';
        iconColor = 'text-indigo-600';
        iconBg = 'bg-indigo-50';
      }
      
      // 4. Attendance
      if (type.includes('attendance') || type.includes('attendancesession')) {
        icon = 'rule';
        iconColor = 'text-purple-600';
        iconBg = 'bg-purple-50';
        if (actionStr.includes('taken') || actionStr.includes('created')) text = 'Pasó lista asistencia';
      }

      return {
        id: act.id,
        actorName: act.actorUser?.fullName || 'Sistema',
        action: act.action,
        entityType: act.entityType,
        entityId: act.entityId,
        occurredAt: act.occurredAt.toISOString(),
        metadata: act.metadata ? JSON.parse(act.metadata) : null,
        display: { icon, iconColor, iconBg, text }
      };
    }),
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit)
    }
  };
}
