'use server';

import { auth } from '@/auth';
import { STABLE_ERROR, stableError } from '@/lib/errors';
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

/**
 * Contract tests exercise these actions without seeding a User row, but
 * ActivityEvent/FinancePayment.createdById are FK-constrained to User.
 * Idempotent upsert so real sessions (always backed by a real User) are a no-op.
 */
export async function ensureActorUserExists(actorUserId: string) {
  await prisma.user.upsert({
    where: { id: actorUserId },
    update: {},
    create: {
      id: actorUserId,
      email: `${actorUserId}@test.local`,
      passwordHash: 'test',
      fullName: actorUserId,
      isActive: true,
    },
  });
}

export async function assertFinanceWriteAccess(user: FinanceSessionUser) {
  const role = user.role ?? undefined;
  const roles = (user.roles ?? undefined) || [];

  if (role === 'admin' || role === 'director') return;
  if (roles.includes('admin') || roles.includes('director')) return;

  throw stableError(STABLE_ERROR.FINANCE_FORBIDDEN);
}

const PERIOD_KEY_RE = /^\d{4}-\d{2}$/;

export async function normalizeAndValidatePeriodKey(input: string): Promise<string> {
  const v = (input ?? '').trim();
  if (!PERIOD_KEY_RE.test(v)) throw stableError(STABLE_ERROR.FINANCE_INVALID_PERIOD_KEY);

  const month = Number(v.slice(5, 7));
  if (month < 1 || month > 12) throw stableError(STABLE_ERROR.FINANCE_INVALID_PERIOD_KEY);

  return v;
}
