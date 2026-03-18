'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  publishedAt: string | null;
  createdAt: string;
  createdByName: string | null;
  targetCount: number;
  targets: { targetType: string; targetId: string | null }[];
};

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getAnnouncements(tenantSlug?: string): Promise<AnnouncementRow[]> {
  try {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');
    tenantSlug = session.user.tenantSlug;

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new Error('Tenant not found');

    const rows = await prisma.announcement.findMany({
      where: { tenantId: tenant.id },
      include: {
        createdBy: { select: { fullName: true } },
        targets: { select: { targetType: true, targetId: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rows.map(r => ({
      id: r.id,
      title: r.title,
      body: r.body,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      createdByName: r.createdBy?.fullName ?? null,
      targetCount: r.targets.length,
      targets: r.targets.map(t => ({ targetType: t.targetType, targetId: t.targetId })),
    }));
  } catch (error: any) {
    console.error('🔥 [getAnnouncements] Error:', error);
    throw new Error(`getAnnouncements error: ${error.message}`);
  }
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createAnnouncement(
  data: {
    title: string;
    body: string;
    publishNow: boolean;
    targetType: 'all' | 'grade' | 'section';
    targetId?: string;
  },
  tenantSlug?: string
) {
  try {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');
    tenantSlug = session.user.tenantSlug;

    if (!data.title?.trim()) return { error: 'El título es requerido' };
    if (!data.body?.trim()) return { error: 'El cuerpo del comunicado es requerido' };

    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (!tenant) throw new Error('Tenant not found');

    const announcement = await prisma.announcement.create({
      data: {
        tenantId: tenant.id,
        title: data.title.trim(),
        body: data.body.trim(),
        createdById: session.user.id,
        publishedAt: data.publishNow ? new Date() : null,
        targets: {
          create: [{
            tenantId: tenant.id,
            targetType: data.targetType,
            targetId: data.targetId || null,
          }]
        }
      }
    });

    await prisma.activityEvent.create({
      data: {
        tenantId: tenant.id,
        actorUserId: session.user.id,
        action: 'created',
        entityType: 'announcement',
        entityId: announcement.id,
        metadata: JSON.stringify({ title: data.title }),
      }
    });

    revalidatePath('/admin/announcements');
    return { success: true, id: announcement.id };
  } catch (error: any) {
    console.error('🔥 [createAnnouncement] Error:', error);
    return { error: `Database error: ${error.message}` };
  }
}

// ─── Publish ──────────────────────────────────────────────────────────────────

export async function publishAnnouncement(id: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  await prisma.announcement.updateMany({
    where: { id, tenantId: tenant.id },
    data: { publishedAt: new Date() },
  });

  revalidatePath('/admin/announcements');
  return { success: true };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteAnnouncement(id: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  await prisma.announcement.deleteMany({
    where: { id, tenantId: tenant.id },
  });

  revalidatePath('/admin/announcements');
  return { success: true };
}
