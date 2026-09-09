'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { STABLE_ERROR, stableError } from '@/lib/errors';

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

async function assertInventoryAdmin(session: Session) {
  if (!isAdminOrDirector(session)) throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
}

export type AssetRow = {
  id: string;
  name: string;
  category: string | null;
  serialNumber: string | null;
  location: string | null;
  status: string;
  assignedToStaffName: string | null;
};

export async function getAssets(search?: string): Promise<AssetRow[]> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertInventoryAdmin(session.user);
  const tenant = await getTenant(session.user);

  const assets = await prisma.asset.findMany({
    where: {
      tenantId: tenant.id,
      ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { serialNumber: { contains: search, mode: 'insensitive' } }] } : {}),
    },
    include: { assignedToStaff: true },
    orderBy: { name: 'asc' },
  });

  return assets.map((a) => ({
    id: a.id,
    name: a.name,
    category: a.category,
    serialNumber: a.serialNumber,
    location: a.location,
    status: a.status,
    assignedToStaffName: a.assignedToStaff?.fullName ?? null,
  }));
}

export async function createAsset(data: {
  name: string;
  category?: string;
  serialNumber?: string;
  location?: string;
  purchaseCostCents?: number;
}): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertInventoryAdmin(session.user);
  const tenant = await getTenant(session.user);

  if (!data.name.trim()) return { error: STABLE_ERROR.INVALID_TARGET };

  await prisma.asset.create({
    data: {
      tenantId: tenant.id,
      name: data.name.trim(),
      category: data.category,
      serialNumber: data.serialNumber,
      location: data.location,
      purchaseCostCents: data.purchaseCostCents,
    },
  });

  safeRevalidate('/admin/inventory');
  return { success: true };
}

async function logAssetAction(tenantId: string, assetId: string, action: string, notes?: string) {
  await prisma.assetLog.create({ data: { tenantId, assetId, action, notes } });
}

export async function assignAsset(assetId: string, staffId: string): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertInventoryAdmin(session.user);
  const tenant = await getTenant(session.user);

  const asset = await prisma.asset.findFirst({ where: { id: assetId, tenantId: tenant.id } });
  if (!asset) return { error: STABLE_ERROR.ASSET_NOT_FOUND };

  const staff = await prisma.staff.findFirst({ where: { id: staffId, tenantId: tenant.id } });
  if (!staff) return { error: STABLE_ERROR.INVALID_TARGET };

  await prisma.asset.update({ where: { id: assetId }, data: { status: 'assigned', assignedToStaffId: staffId } });
  await logAssetAction(tenant.id, assetId, 'assigned', `Asignado a ${staff.fullName}`);

  safeRevalidate('/admin/inventory');
  return { success: true };
}

export async function returnAsset(assetId: string): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertInventoryAdmin(session.user);
  const tenant = await getTenant(session.user);

  const asset = await prisma.asset.findFirst({ where: { id: assetId, tenantId: tenant.id } });
  if (!asset) return { error: STABLE_ERROR.ASSET_NOT_FOUND };

  await prisma.asset.update({ where: { id: assetId }, data: { status: 'available', assignedToStaffId: null } });
  await logAssetAction(tenant.id, assetId, 'returned');

  safeRevalidate('/admin/inventory');
  return { success: true };
}

export async function sendToMaintenance(assetId: string, notes?: string): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertInventoryAdmin(session.user);
  const tenant = await getTenant(session.user);

  const asset = await prisma.asset.findFirst({ where: { id: assetId, tenantId: tenant.id } });
  if (!asset) return { error: STABLE_ERROR.ASSET_NOT_FOUND };

  await prisma.asset.update({ where: { id: assetId }, data: { status: 'maintenance', assignedToStaffId: null } });
  await logAssetAction(tenant.id, assetId, 'maintenance', notes);

  safeRevalidate('/admin/inventory');
  return { success: true };
}

export async function retireAsset(assetId: string): Promise<{ success: true } | { error: string }> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertInventoryAdmin(session.user);
  const tenant = await getTenant(session.user);

  const asset = await prisma.asset.findFirst({ where: { id: assetId, tenantId: tenant.id } });
  if (!asset) return { error: STABLE_ERROR.ASSET_NOT_FOUND };

  await prisma.asset.update({ where: { id: assetId }, data: { status: 'retired', assignedToStaffId: null } });
  await logAssetAction(tenant.id, assetId, 'retired');

  safeRevalidate('/admin/inventory');
  return { success: true };
}

export type AssetLogRow = { id: string; action: string; notes: string | null; occurredAt: string };

export async function getAssetLog(assetId: string): Promise<AssetLogRow[]> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertInventoryAdmin(session.user);
  const tenant = await getTenant(session.user);

  const logs = await prisma.assetLog.findMany({
    where: { tenantId: tenant.id, assetId },
    orderBy: { occurredAt: 'desc' },
  });

  return logs.map((l) => ({ id: l.id, action: l.action, notes: l.notes, occurredAt: l.occurredAt.toISOString() }));
}
