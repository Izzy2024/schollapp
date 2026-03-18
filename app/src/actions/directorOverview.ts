'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { getTestPrisma } from '@/lib/test-seams';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import { getEnrollmentStats } from '@/actions/directorStats';

function getUtcTodayWindow() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
  return { start, end };
}

export async function getDirectorOverviewStats(tenantSlug?: string) {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if (session.user.role !== 'DIRECTOR') {
    throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
  }

  const db: typeof prisma = (getTestPrisma<typeof prisma>() ?? prisma) as any;

  const tenant = await db.tenant.findUnique({
    where: { slug: session.user.tenantSlug },
  });

  if (!tenant) throw new Error('Tenant not found');

  const enrollment = await getEnrollmentStats(session.user.tenantSlug);

  const pendingClassRequests = await db.classRequest.count({
    where: { tenantId: tenant.id, status: 'pending' },
  });

  const { start, end } = getUtcTodayWindow();

  const [totalRecordsToday, presentRecordsToday] = await Promise.all([
    db.attendanceRecord.count({
      where: {
        tenantId: tenant.id,
        attendanceSession: {
          date: { gte: start, lte: end },
        },
      },
    }),
    db.attendanceRecord.count({
      where: {
        tenantId: tenant.id,
        status: 'present',
        attendanceSession: {
          date: { gte: start, lte: end },
        },
      },
    }),
  ]);

  const attendanceTodayPct = totalRecordsToday > 0 ? Math.round((presentRecordsToday / totalRecordsToday) * 100) : null;

  return {
    totalEnrolled: enrollment.totalEnrolled,
    studentsWithoutEnrollment: enrollment.studentsWithoutEnrollment,
    attendanceTodayPct,
    pendingBreakdown: {
      classRequests: pendingClassRequests,
      scheduleRequests: 0,
      announcementsToPublish: 0,
      role: 'DIRECTOR',
      scopeTenantId: tenant.id,
    },
  };
}
