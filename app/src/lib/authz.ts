import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import { hasPermission } from '@/lib/rbac';

export type AuthzContext = {
  tenantId: string;
  tenantSlug: string;
  userId: string;
  roles: string[];
};

export async function requireTenant(): Promise<AuthzContext> {
  const session = await auth();
  if (!session?.user?.id) {
    throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
  }

  const tenantSlug = session.user.tenantSlug;
  if (!tenantSlug) {
    throw stableError(STABLE_ERROR.TENANT_NOT_FOUND);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) {
    throw stableError(STABLE_ERROR.TENANT_NOT_FOUND);
  }

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    userId: session.user.id,
    roles: session.user.roles ?? [],
  };
}

export async function requirePermission(code: string): Promise<AuthzContext> {
  const ctx = await requireTenant();
  const allowed = await hasPermission(ctx.tenantId, ctx.userId, code);
  if (!allowed) {
    throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
  }
  return ctx;
}
