'use server';

import { auth } from '@/auth';
import { getRecentActivities } from '@/actions/activity';
import { STABLE_ERROR, stableError } from '@/lib/errors';

export async function getDirectorRecentActivities(
  tenantSlug?: string,
  filterEntityType?: string,
  page: number = 1,
  limit: number = 50
) {
  const session = await auth();

  if (!session?.user) {
    throw new Error('Unauthorized');
  }

  if ((session.user as { role?: string | null }).role !== 'DIRECTOR') {
    throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
  }

  return getRecentActivities(session.user.tenantSlug, filterEntityType, page, limit);
}
