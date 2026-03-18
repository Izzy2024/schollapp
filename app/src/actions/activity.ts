'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { getTestPrisma } from '@/lib/test-seams';
import { parseActivityMetadata } from '@/lib/activity-metadata';
import {
  ACTIVITY_TAXONOMY,
  buildActivityFilterWhere,
  normalizeActivityEntityType,
  normalizeActivityFilter,
} from '@/lib/activity-taxonomy';

export async function getRecentActivities(
  tenantSlug?: string,
  filterEntityType?: string,
  page: number = 1,
  limit: number = 50
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const currentTenantSlug = tenantSlug || session.user.tenantSlug;

  const db: typeof prisma = (getTestPrisma<typeof prisma>() ?? prisma) as any;

  const tenant = await db.tenant.findUnique({
    where: { slug: currentTenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const canonicalFilter = normalizeActivityFilter(filterEntityType);
  const whereClause: any = {
    tenantId: tenant.id,
    ...buildActivityFilterWhere(canonicalFilter),
  };

  const offset = (Math.max(1, page) - 1) * limit;

  const [activities, totalCount] = await Promise.all([
    db.activityEvent.findMany({
      where: whereClause,
      include: {
        actorUser: {
          select: { fullName: true },
        },
      },
      orderBy: { occurredAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    db.activityEvent.count({ where: whereClause }),
  ]);

  return {
    activities: activities
      .filter((act) => act.tenantId === tenant.id)
      .map((act) => {
        const normalizedEntity = normalizeActivityEntityType(act.entityType) ?? 'announcement';

        let icon = ACTIVITY_TAXONOMY[normalizedEntity].icon;
        let iconColor = 'text-gray-500';
        let iconBg = 'bg-gray-100';
        let text = `Acción: ${act.action} en ${act.entityType} (${act.entityId})`;

        const actionStr = act.action?.toLowerCase() || '';

        if (normalizedEntity === 'enrollment') {
          icon = actionStr.includes('unenroll') ? 'person_remove' : 'how_to_reg';
          iconColor = actionStr.includes('unenroll') ? 'text-red-600' : 'text-green-600';
          iconBg = actionStr.includes('unenroll') ? 'bg-red-50' : 'bg-green-50';
          if (actionStr.includes('created') || actionStr.includes('enrolled')) text = 'Inscribió a un alumno';
          if (actionStr.includes('deleted') || actionStr.includes('unenrolled')) text = 'Dio de baja a un alumno';
        }

        if (normalizedEntity === 'announcement') {
          icon = 'campaign';
          iconColor = 'text-amber-600';
          iconBg = 'bg-amber-50';
          if (actionStr === 'announcement.created' || actionStr.includes('created')) text = 'Creó un nuevo comunicado';
          if (actionStr === 'announcement.published' || actionStr.includes('published') || actionStr === 'publish') text = 'Publicó un comunicado';
          if (actionStr === 'announcement.deleted' || actionStr.includes('deleted')) text = 'Eliminó un comunicado';
        }

        if (normalizedEntity === 'attendance') {
          icon = 'rule';
          iconColor = 'text-purple-600';
          iconBg = 'bg-purple-50';
          if (actionStr.includes('taken') || actionStr.includes('created')) text = 'Pasó lista asistencia';
        }

        return {
          id: act.id,
          actorName: act.actorUser?.fullName || 'Sistema',
          action: act.action,
          entityType: normalizedEntity,
          entityId: act.entityId,
          occurredAt: act.occurredAt.toISOString(),
          metadata: parseActivityMetadata(act.metadata),
          display: { icon, iconColor, iconBg, text },
        };
      }),
    pagination: {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
}
