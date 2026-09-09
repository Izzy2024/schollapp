'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import { revalidatePath } from 'next/cache';

// ─── Types ────────────────────────────────────────────────────────────────────

type AnnouncementTargetInput = {
  targetType: 'all' | 'grade' | 'section';
  targetId?: string;
};

type AnnouncementWriteContext = {
  tenantId: string;
  tenantSlug: string;
  actorUserId: string;
  roles: string[];
};

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAnnouncementWriteContext(tenantSlug?: string): Promise<AnnouncementWriteContext> {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const resolvedTenantSlug = session.user.tenantSlug ?? tenantSlug;
  const tenant = await prisma.tenant.findUnique({ where: { slug: resolvedTenantSlug } });
  if (!tenant || !resolvedTenantSlug) throw new Error('Tenant not found');

  return {
    tenantId: tenant.id,
    tenantSlug: resolvedTenantSlug,
    actorUserId: session.user.id,
    roles: Array.isArray((session.user as { roles?: string[] }).roles)
      ? (session.user as { roles?: string[] }).roles ?? []
      : [],
  };
}

function assertAnnouncementWriteAccess(roles: string[]) {
  const normalizedRoles = roles.map((role) => String(role).toLowerCase());
  if (normalizedRoles.includes('admin') || normalizedRoles.includes('director')) return;
  throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
}

async function assertValidAnnouncementTarget(tenantId: string, target: AnnouncementTargetInput) {
  const targetId = target.targetId?.trim() || undefined;

  if (target.targetType === 'all') {
    if (targetId) throw stableError(STABLE_ERROR.INVALID_TARGET);
    return { targetType: 'all' as const, targetId: null as string | null };
  }

  if (!targetId) {
    throw stableError(STABLE_ERROR.INVALID_TARGET);
  }

  if (target.targetType === 'grade') {
    const grade = await prisma.gradeLevel.findFirst({ where: { id: targetId } });
    if (!grade) throw stableError(STABLE_ERROR.INVALID_TARGET);
    if (grade.tenantId !== tenantId) throw stableError(STABLE_ERROR.TARGET_SCOPE_VIOLATION);
    return { targetType: 'grade' as const, targetId };
  }

  if (target.targetType === 'section') {
    const section = await prisma.section.findFirst({ where: { id: targetId } });
    if (!section) throw stableError(STABLE_ERROR.INVALID_TARGET);
    if (section.tenantId !== tenantId) throw stableError(STABLE_ERROR.TARGET_SCOPE_VIOLATION);
    return { targetType: 'section' as const, targetId };
  }

  throw stableError(STABLE_ERROR.INVALID_TARGET);
}

async function createAnnouncementEvent(params: {
  tenantId: string;
  actorUserId: string;
  announcementId: string;
  action: 'announcement.created' | 'announcement.published' | 'announcement.deleted';
  targetType: 'all' | 'grade' | 'section';
  targetId: string | null;
  publishedNow: boolean;
}) {
  await prisma.activityEvent.create({
    data: {
      tenantId: params.tenantId,
      actorUserId: params.actorUserId,
      action: params.action,
      entityType: 'announcement',
      entityId: params.announcementId,
      metadata: JSON.stringify({
        targetType: params.targetType,
        targetId: params.targetId,
        publishedNow: params.publishedNow,
        actorUserId: params.actorUserId,
      }),
    },
  });
}

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

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      body: r.body,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
      createdByName: r.createdBy?.fullName ?? null,
      targetCount: r.targets.length,
      targets: r.targets.map((t) => ({ targetType: t.targetType, targetId: t.targetId })),
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
  const context = await getAnnouncementWriteContext(tenantSlug);
  assertAnnouncementWriteAccess(context.roles);

  if (!data.title?.trim()) return { error: 'El título es requerido' };
  if (!data.body?.trim()) return { error: 'El cuerpo del comunicado es requerido' };

  const target = await assertValidAnnouncementTarget(context.tenantId, {
    targetType: data.targetType,
    targetId: data.targetId,
  });

  const announcement = await prisma.announcement.create({
    data: {
      tenantId: context.tenantId,
      title: data.title.trim(),
      body: data.body.trim(),
      createdById: context.actorUserId,
      publishedAt: data.publishNow ? new Date() : null,
      targets: {
        create: [
          {
            tenantId: context.tenantId,
            targetType: target.targetType,
            targetId: target.targetId,
          },
        ],
      },
    },
  });

  await createAnnouncementEvent({
    tenantId: context.tenantId,
    actorUserId: context.actorUserId,
    announcementId: announcement.id,
    action: 'announcement.created',
    targetType: target.targetType,
    targetId: target.targetId,
    publishedNow: Boolean(data.publishNow),
  });

  revalidatePath('/admin/announcements');
  return { success: true, id: announcement.id };
}

// ─── Publish ──────────────────────────────────────────────────────────────────

export async function publishAnnouncement(id: string, tenantSlug?: string) {
  const context = await getAnnouncementWriteContext(tenantSlug);
  assertAnnouncementWriteAccess(context.roles);

  const existing = await prisma.announcement.findFirst({
    where: { id, tenantId: context.tenantId },
    include: { targets: { select: { targetType: true, targetId: true } } },
  });

  if (!existing) throw stableError(STABLE_ERROR.ANNOUNCEMENT_NOT_FOUND);

  await prisma.announcement.updateMany({
    where: { id, tenantId: context.tenantId },
    data: { publishedAt: new Date() },
  });

  const firstTarget = existing.targets[0] ?? { targetType: 'all', targetId: null };

  await createAnnouncementEvent({
    tenantId: context.tenantId,
    actorUserId: context.actorUserId,
    announcementId: id,
    action: 'announcement.published',
    targetType: (firstTarget.targetType as 'all' | 'grade' | 'section') ?? 'all',
    targetId: firstTarget.targetId,
    publishedNow: true,
  });

  revalidatePath('/admin/announcements');
  return { success: true };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteAnnouncement(id: string, tenantSlug?: string) {
  const context = await getAnnouncementWriteContext(tenantSlug);
  assertAnnouncementWriteAccess(context.roles);

  const existing = await prisma.announcement.findFirst({
    where: { id, tenantId: context.tenantId },
    include: { targets: { select: { targetType: true, targetId: true } } },
  });

  if (!existing) throw stableError(STABLE_ERROR.ANNOUNCEMENT_NOT_FOUND);

  await prisma.announcement.deleteMany({
    where: { id, tenantId: context.tenantId },
  });

  const firstTarget = existing.targets[0] ?? { targetType: 'all', targetId: null };

  await createAnnouncementEvent({
    tenantId: context.tenantId,
    actorUserId: context.actorUserId,
    announcementId: id,
    action: 'announcement.deleted',
    targetType: (firstTarget.targetType as 'all' | 'grade' | 'section') ?? 'all',
    targetId: firstTarget.targetId,
    publishedNow: existing.publishedAt != null,
  });

  revalidatePath('/admin/announcements');
  return { success: true };
}
