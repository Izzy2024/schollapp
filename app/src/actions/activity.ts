'use server';

import prisma from '@/lib/prisma';
import { getTestPrisma } from '@/lib/test-seams';
import { requireTenant } from '@/lib/authz';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import { parseActivityMetadata } from '@/lib/activity-metadata';
import {
  ACTIVITY_TAXONOMY,
  buildActivityFilterWhere,
  normalizeActivityEntityType,
  normalizeActivityFilter,
} from '@/lib/activity-taxonomy';

export async function getRecentActivities(
  filterEntityType?: string,
  page: number = 1,
  limit: number = 50
) {
  const ctx = await requireTenant();
  if (!ctx.roles.includes('admin') && !ctx.roles.includes('director')) {
    throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
  }

  // Gracefully handle legacy callers passing (undefined, filter, page, limit)
  let actualFilter = filterEntityType;
  let actualPage = page;
  let actualLimit = limit;
  if (typeof page === 'string') {
    actualFilter = page;
    actualPage = typeof limit === 'number' ? limit : 1;
    actualLimit = 50;
  }

  const db: typeof prisma = getTestPrisma<typeof prisma>() ?? prisma;

  const canonicalFilter = normalizeActivityFilter(actualFilter);
  const whereClause = {
    tenantId: ctx.tenantId,
    ...buildActivityFilterWhere(canonicalFilter),
  };

  const offset = (Math.max(1, actualPage) - 1) * actualLimit;

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
      take: actualLimit,
    }),
    db.activityEvent.count({ where: whereClause }),
  ]);

  return {
    activities: activities
      .filter((act) => act.tenantId === ctx.tenantId)
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

        if (normalizedEntity === 'finance') {
          icon = 'paid';
          iconColor = 'text-emerald-700';
          iconBg = 'bg-emerald-50';

          if (actionStr === 'finance.concept.created') text = 'Creó un concepto de cobro';
          else if (actionStr === 'finance.concept.updated') text = 'Actualizó un concepto de cobro';
          else if (actionStr === 'finance.charge.created') text = 'Generó un cargo';
          else if (actionStr === 'finance.payment.recorded') text = 'Registró un pago';
          else text = `Acción de finanzas: ${act.action}`;
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
      page: actualPage,
      limit: actualLimit,
      totalPages: Math.ceil(totalCount / actualLimit),
    },
  };
}
