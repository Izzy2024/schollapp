'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import type { Prisma } from '@prisma/client';

// ponytail: revalidatePath needs a Next.js request context; contract tests run
// this action outside one, so failures here are swallowed (cache staleness, not correctness).
function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // no-op outside a Next.js request context (e.g. tests)
  }
}

type Session = {
  id: string;
  email?: string | null;
  tenantSlug?: string | null;
  roles?: string[] | null;
};

async function getTenant(session: Session) {
  if (!session.tenantSlug) throw new Error('Tenant not found');
  const tenant = await prisma.tenant.findUnique({ where: { slug: session.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');
  return tenant;
}

function isAdminOrDirector(session: Session): boolean {
  const roles = session.roles ?? [];
  return roles.includes('admin') || roles.includes('director');
}

async function assertCafeteriaAdmin(session: Session) {
  if (!isAdminOrDirector(session)) throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
}

async function assertStudentAccess(tenantId: string, studentId: string, session: Session): Promise<void> {
  if (isAdminOrDirector(session)) return;

  const student = await prisma.student.findFirst({ where: { id: studentId, tenantId } });
  if (student?.email && student.email === session.email) return;

  const guardian = session.email ? await prisma.guardian.findFirst({ where: { tenantId, email: session.email } }) : null;
  if (guardian) {
    const link = await prisma.studentGuardian.findUnique({
      where: { tenantId_studentId_guardianId: { tenantId, studentId, guardianId: guardian.id } },
    });
    if (link) return;
  }

  throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
}

export type MenuItemRow = { id: string; name: string; priceCents: number; isActive: boolean };

export async function getMenuItems(): Promise<MenuItemRow[]> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenant = await getTenant(session.user);

  return prisma.cafeteriaMenuItem.findMany({
    where: { tenantId: tenant.id, isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function createMenuItem(data: { name: string; priceCents: number }): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertCafeteriaAdmin(session.user);
  const tenant = await getTenant(session.user);

  if (!data.name.trim() || data.priceCents < 0) return { error: STABLE_ERROR.INVALID_TARGET };

  await prisma.cafeteriaMenuItem.create({ data: { tenantId: tenant.id, name: data.name.trim(), priceCents: data.priceCents } });
  safeRevalidate('/admin/cafeteria');
  return { success: true };
}

export async function deactivateMenuItem(itemId: string): Promise<{ success: true }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertCafeteriaAdmin(session.user);
  const tenant = await getTenant(session.user);

  await prisma.cafeteriaMenuItem.updateMany({ where: { id: itemId, tenantId: tenant.id }, data: { isActive: false } });
  safeRevalidate('/admin/cafeteria');
  return { success: true };
}

export type TransactionRow = {
  id: string;
  type: string;
  amountCents: number;
  description: string | null;
  menuItemName: string | null;
  createdAt: string;
};

export type AccountInfo = { balanceCents: number; transactions: TransactionRow[] };

async function getOrCreateAccount(tenantId: string, studentId: string, client: typeof prisma | Prisma.TransactionClient = prisma) {
  return client.cafeteriaAccount.upsert({
    where: { tenantId_studentId: { tenantId, studentId } },
    update: {},
    create: { tenantId, studentId, balanceCents: 0 },
  });
}

export async function getAccountInfo(studentId: string): Promise<AccountInfo> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenant = await getTenant(session.user);
  await assertStudentAccess(tenant.id, studentId, session.user);

  const account = await prisma.cafeteriaAccount.findUnique({ where: { tenantId_studentId: { tenantId: tenant.id, studentId } } });
  const transactions = await prisma.cafeteriaTransaction.findMany({
    where: { tenantId: tenant.id, studentId },
    include: { menuItem: true },
    orderBy: { createdAt: 'desc' },
  });

  return {
    balanceCents: account?.balanceCents ?? 0,
    transactions: transactions.map((t) => ({
      id: t.id,
      type: t.type,
      amountCents: t.amountCents,
      description: t.description,
      menuItemName: t.menuItem?.name ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}

export async function topUpAccount(studentId: string, amountCents: number, description?: string): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertCafeteriaAdmin(session.user);
  const tenant = await getTenant(session.user);

  if (amountCents <= 0) return { error: STABLE_ERROR.INVALID_TARGET };

  const student = await prisma.student.findFirst({ where: { id: studentId, tenantId: tenant.id } });
  if (!student) return { error: STABLE_ERROR.INVALID_TARGET };

  const actorUserId = session.user.id;
  await prisma.$transaction(async (tx) => {
    await getOrCreateAccount(tenant.id, studentId, tx);
    await tx.cafeteriaAccount.update({
      where: { tenantId_studentId: { tenantId: tenant.id, studentId } },
      data: { balanceCents: { increment: amountCents } },
    });
    await tx.cafeteriaTransaction.create({
      data: { tenantId: tenant.id, studentId, type: 'topup', amountCents, description, createdById: actorUserId },
    });
  });

  safeRevalidate('/admin/cafeteria');
  return { success: true };
}

export async function recordPurchase(studentId: string, menuItemId: string): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertCafeteriaAdmin(session.user);
  const tenant = await getTenant(session.user);

  const menuItem = await prisma.cafeteriaMenuItem.findFirst({ where: { id: menuItemId, tenantId: tenant.id } });
  if (!menuItem) return { error: STABLE_ERROR.MENU_ITEM_NOT_FOUND };

  const account = await getOrCreateAccount(tenant.id, studentId);
  if (account.balanceCents < menuItem.priceCents) return { error: STABLE_ERROR.INSUFFICIENT_BALANCE };

  await prisma.$transaction([
    prisma.cafeteriaAccount.update({
      where: { tenantId_studentId: { tenantId: tenant.id, studentId } },
      data: { balanceCents: { decrement: menuItem.priceCents } },
    }),
    prisma.cafeteriaTransaction.create({
      data: {
        tenantId: tenant.id,
        studentId,
        menuItemId,
        type: 'purchase',
        amountCents: menuItem.priceCents,
        createdById: session.user.id,
      },
    }),
  ]);

  safeRevalidate('/admin/cafeteria');
  return { success: true };
}
