import { STABLE_ERROR, stableError } from '@/lib/errors';
import prisma from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';

/**
 * Contract tests exercise these actions without seeding a User row, but
 * ActivityEvent/FinancePayment.createdById are FK-constrained to User.
 * Idempotent upsert so real sessions (always backed by a real User) are a no-op.
 *
 * Hallazgo SEG-L5: en producción no debe crear usuarios fantasma.
 */
export async function ensureActorUserExists(actorUserId: string) {
  if (process.env.NODE_ENV === 'production') return;

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

export async function assertFinanceWriteAccess(tenantId: string, userId: string) {
  const ok = await hasPermission(tenantId, userId, 'finance:write');
  if (!ok) throw stableError(STABLE_ERROR.FINANCE_FORBIDDEN);
}

const PERIOD_KEY_RE = /^\d{4}(-[A-Z0-9]+)?$/i;

export async function normalizeAndValidatePeriodKey(input: string): Promise<string> {
  const v = (input ?? '').trim().toUpperCase();
  if (!PERIOD_KEY_RE.test(v)) throw stableError(STABLE_ERROR.FINANCE_INVALID_PERIOD_KEY);

  // If it matches YYYY-MM, we optionally check valid month
  const match = v.match(/^\d{4}-(\d{2})$/);
  if (match) {
    const month = Number(match[1]);
    if (month < 1 || month > 12) throw stableError(STABLE_ERROR.FINANCE_INVALID_PERIOD_KEY);
  }

  return v;
}
