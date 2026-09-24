'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { STABLE_ERROR, stableError } from '@/lib/errors';

export type CalendarEventDTO = {
  id: string;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date | null;
  allDay: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null;
};

function isWriteRole(roles: string[] = []) {
  const r = roles.map((x) => x.toLowerCase());
  return r.includes('admin') || r.includes('director');
}

async function requireTenantSession() {
  const session = await auth();
  if (!session?.user?.id) throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);

  const tenantSlug = ((session.user as any).tenantSlug ?? (session.user as any).tenantId) as string | undefined;
  const tenantId = (session.user as any).tenantId as string | undefined;
  const tenantKey = (tenantSlug ?? tenantId) as string | undefined;
  if (!tenantKey) throw stableError(STABLE_ERROR.INVALID_TARGET);

  const tenant = await prisma.tenant.findFirst({
    where: { OR: [{ slug: tenantKey }, { id: tenantKey }] },
    select: { id: true },
  });
  if (!tenant) throw stableError(STABLE_ERROR.INVALID_TARGET);

  return {
    tenantId: tenant.id,
    actorUserId: session.user.id,
    roles: (session.user.roles ?? []) as string[],
  };
}

export async function listCalendarEvents(input: { startAt: Date; endAt: Date }): Promise<CalendarEventDTO[]> {
  const ctx = await requireTenantSession();

  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);
  if (!(startAt instanceof Date) || isNaN(startAt.getTime())) throw stableError(STABLE_ERROR.INVALID_TARGET);
  if (!(endAt instanceof Date) || isNaN(endAt.getTime())) throw stableError(STABLE_ERROR.INVALID_TARGET);

  const events = await prisma.schoolCalendarEvent.findMany({
    where: {
      tenantId: ctx.tenantId,
      // overlaps range:
      // startAt <= end AND (endAt is null OR endAt >= start)
      startAt: { lte: endAt },
      OR: [{ endAt: null }, { endAt: { gte: startAt } }],
    },
    orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      title: true,
      description: true,
      startAt: true,
      endAt: true,
      allDay: true,
      createdAt: true,
      updatedAt: true,
      createdById: true,
    },
  });

  return events;
}

export async function createCalendarEvent(input: {
  title: string;
  description?: string | null;
  startAt: Date;
  endAt?: Date | null;
  allDay?: boolean;
}): Promise<{ id: string }> {
  const ctx = await requireTenantSession();
  if (!isWriteRole(ctx.roles)) throw stableError(STABLE_ERROR.CALENDAR_FORBIDDEN);

  const title = (input.title ?? '').trim();
  if (!title) throw stableError(STABLE_ERROR.INVALID_TARGET);

  const startAt = new Date(input.startAt);
  if (isNaN(startAt.getTime())) throw stableError(STABLE_ERROR.INVALID_TARGET);

  const endAt = input.endAt ? new Date(input.endAt) : null;
  if (endAt && isNaN(endAt.getTime())) throw stableError(STABLE_ERROR.INVALID_TARGET);
  if (endAt && endAt.getTime() < startAt.getTime()) throw stableError(STABLE_ERROR.INVALID_TARGET);

  const ev = await prisma.schoolCalendarEvent.create({
    data: {
      tenantId: ctx.tenantId,
      title,
      description: input.description ?? null,
      startAt,
      endAt,
      allDay: Boolean(input.allDay ?? false),
      createdById: ctx.actorUserId,
    },
    select: { id: true },
  });

  return ev;
}

export async function updateCalendarEvent(input: {
  id: string;
  title?: string;
  description?: string | null;
  startAt?: Date;
  endAt?: Date | null;
  allDay?: boolean;
}): Promise<{ id: string }> {
  const ctx = await requireTenantSession();
  if (!isWriteRole(ctx.roles)) throw stableError(STABLE_ERROR.CALENDAR_FORBIDDEN);

  const existing = await prisma.schoolCalendarEvent.findFirst({
    where: { id: input.id, tenantId: ctx.tenantId },
    select: { id: true, startAt: true, endAt: true },
  });
  if (!existing) throw stableError(STABLE_ERROR.CALENDAR_EVENT_NOT_FOUND);

  const nextStartAt = input.startAt ? new Date(input.startAt) : existing.startAt;
  const nextEndAt = input.endAt === undefined ? existing.endAt : input.endAt ? new Date(input.endAt) : null;
  if (nextEndAt && nextEndAt.getTime() < nextStartAt.getTime()) throw stableError(STABLE_ERROR.INVALID_TARGET);

  const updated = await prisma.schoolCalendarEvent.update({
    where: { id: existing.id },
    data: {
      ...(input.title !== undefined ? { title: input.title.trim() } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.startAt !== undefined ? { startAt: nextStartAt } : {}),
      ...(input.endAt !== undefined ? { endAt: nextEndAt } : {}),
      ...(input.allDay !== undefined ? { allDay: Boolean(input.allDay) } : {}),
    },
    select: { id: true },
  });

  return updated;
}

export async function deleteCalendarEvent(input: { id: string }): Promise<{ id: string }> {
  const ctx = await requireTenantSession();
  if (!isWriteRole(ctx.roles)) throw stableError(STABLE_ERROR.CALENDAR_FORBIDDEN);

  const existing = await prisma.schoolCalendarEvent.findFirst({
    where: { id: input.id, tenantId: ctx.tenantId },
    select: { id: true },
  });
  if (!existing) throw stableError(STABLE_ERROR.CALENDAR_EVENT_NOT_FOUND);

  await prisma.schoolCalendarEvent.delete({ where: { id: existing.id } });
  return { id: existing.id };
}
