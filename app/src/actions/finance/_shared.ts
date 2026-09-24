'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export type FinanceSessionUser = {
  id: string;
  email?: string | null;
  tenantSlug?: string | null;
  role?: string | null;
  roles?: string[] | null;
  // Parent/guardian context (used by /parent/finances and FinanceStatement getForParent)
  guardianId?: string | null;
};

export async function getTenantIdFromSession(): Promise<{ tenantId: string; tenantSlug: string; actorUserId: string; user: FinanceSessionUser }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenantSlug = session.user.tenantSlug;
  if (!tenantSlug) throw new Error('Tenant not found');

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  return {
    tenantId: tenant.id,
    tenantSlug,
    actorUserId: session.user.id,
    user: session.user as FinanceSessionUser,
  };
}
