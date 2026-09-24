'use server';

import { auth } from '@/auth';

import prisma from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';
import { revalidatePath } from 'next/cache';
import {
  findNearbyScheduleSuggestions,
  findScheduleConflicts,
  formatSlot,
  isValidRange,
} from './scheduleConflicts-internal';

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    return;
  }
}

export async function previewScheduleRequestConflict(
  sectionSubjectId: string,
  type: 'new' | 'change',
  proposedDayOfWeek: number,
  proposedStartTime: string,
  proposedEndTime: string,
  proposedRoom: string | null,
  tenantSlug?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const staff = await prisma.staff.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id }
  });
  if (!staff) throw new Error('No se encontró tu perfil de docente');

  if (!sectionSubjectId?.trim()) return { ok: false, error: 'Clase inválida' };
  if (proposedDayOfWeek < 1 || proposedDayOfWeek > 6) return { ok: false, error: 'Día propuesto inválido.' };
  if (!proposedStartTime || !proposedEndTime) return { ok: false, error: 'Horario propuesto incompleto.' };
  if (!isValidRange(proposedStartTime, proposedEndTime)) return { ok: false, error: 'La hora de inicio debe ser menor a la hora fin.' };

  const sectionSubject = await prisma.sectionSubject.findUnique({
    where: { id: sectionSubjectId },
    include: { schedules: true }
  });
  if (!sectionSubject || sectionSubject.tenantId !== tenant.id) return { ok: false, error: 'Clase no encontrada.' };

  const proposedKey = formatSlot(proposedDayOfWeek, proposedStartTime, proposedEndTime, proposedRoom);
  const hasSameSchedule = sectionSubject.schedules.some(s => (
    formatSlot(s.dayOfWeek, s.startTime, s.endTime, s.room) === proposedKey
  ));
  if (hasSameSchedule) return { ok: false, error: 'La propuesta coincide con un horario ya asignado.' };

  const conflicts = await findScheduleConflicts({
    tenantId: tenant.id,
    dayOfWeek: proposedDayOfWeek,
    startTime: proposedStartTime,
    endTime: proposedEndTime,
    room: proposedRoom,
    staffId: staff.id,
    ...(type === 'change' ? { excludeSectionSubjectId: sectionSubjectId } : {})
  });
  if (conflicts.length > 0) {
    const suggestions = await findNearbyScheduleSuggestions({
      tenantId: tenant.id,
      dayOfWeek: proposedDayOfWeek,
      startTime: proposedStartTime,
      endTime: proposedEndTime,
      room: proposedRoom,
      staffId: staff.id,
      ...(type === 'change' ? { excludeSectionSubjectId: sectionSubjectId } : {})
    });
    return {
      ok: false,
      error: conflicts[0].error,
      conflictType: conflicts[0].conflictType,
      conflicts,
      suggestions
    };
  }

  return { ok: true, message: 'Horario disponible. Sin choques detectados.' };
}

export async function createScheduleRequest(
  sectionSubjectId: string,
  type: 'new' | 'change',
  proposedDayOfWeek: number,
  proposedStartTime: string,
  proposedEndTime: string,
  proposedRoom: string | null,
  reason: string,
  alternativeDayOfWeek: number | null,
  alternativeStartTime: string | null,
  alternativeEndTime: string | null,
  alternativeRoom: string | null,
  tenantSlug?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const staff = await prisma.staff.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id }
  });
  if (!staff) throw new Error('No se encontró tu perfil de docente');

  if (!sectionSubjectId?.trim()) return { success: false, error: 'Clase inválida' };
  if (!reason?.trim() || reason.trim().length < 10) return { success: false, error: 'El motivo debe tener al menos 10 caracteres.' };
  if (proposedDayOfWeek < 1 || proposedDayOfWeek > 6) return { success: false, error: 'Día propuesto inválido.' };
  if (!proposedStartTime || !proposedEndTime) return { success: false, error: 'Horario propuesto incompleto.' };
  if (!isValidRange(proposedStartTime, proposedEndTime)) return { success: false, error: 'La hora de inicio debe ser menor a la hora fin.' };

  const duplicatePending = await prisma.scheduleRequest.findFirst({
    where: {
      tenantId: tenant.id,
      sectionSubjectId,
      staffId: staff.id,
      status: 'pending'
    }
  });
  if (duplicatePending) {
    return { success: false, error: 'Ya tienes una solicitud de horario pendiente para esta clase.' };
  }

  const sectionSubject = await prisma.sectionSubject.findUnique({
    where: { id: sectionSubjectId },
    include: { schedules: true }
  });
  if (!sectionSubject || sectionSubject.tenantId !== tenant.id) return { success: false, error: 'Clase no encontrada.' };
  if (sectionSubject.staffId !== staff.id) return { success: false, error: 'No eres el docente asignado a esta clase.' };

  const proposedKey = formatSlot(proposedDayOfWeek, proposedStartTime, proposedEndTime, proposedRoom);
  const hasSameSchedule = sectionSubject.schedules.some(s => (
    formatSlot(s.dayOfWeek, s.startTime, s.endTime, s.room) === proposedKey
  ));

  if (hasSameSchedule) {
    return { success: false, error: 'La propuesta coincide con un horario ya asignado.' };
  }

  const conflicts = await findScheduleConflicts({
    tenantId: tenant.id,
    dayOfWeek: proposedDayOfWeek,
    startTime: proposedStartTime,
    endTime: proposedEndTime,
    room: proposedRoom,
    staffId: staff.id,
    ...(type === 'change' ? { excludeSectionSubjectId: sectionSubjectId } : {})
  });
  if (conflicts.length > 0) return { success: false, error: conflicts[0].error };

  await prisma.scheduleRequest.create({
    data: {
      tenantId: tenant.id,
      sectionSubjectId,
      staffId: staff.id,
      type,
      status: 'pending',
      proposedDayOfWeek,
      proposedStartTime,
      proposedEndTime,
      proposedRoom,
      alternativeDayOfWeek,
      alternativeStartTime,
      alternativeEndTime,
      alternativeRoom,
      reason: reason.trim()
    }
  });

  safeRevalidate('/teacher');
  safeRevalidate(`/teacher/classes/${sectionSubjectId}`);
  safeRevalidate('/admin/schedule-requests');
  safeRevalidate('/director/schedule-requests');

  return { success: true };
}

export async function getScheduleRequests(tenantSlug?: string, status?: 'pending' | 'approved' | 'rejected') {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const requests = await prisma.scheduleRequest.findMany({
    where: {
      tenantId: tenant.id,
      ...(status ? { status } : {})
    },
    include: {
      staff: true,
      sectionSubject: {
        include: {
          subject: true,
          section: { include: { gradeLevel: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return requests.map(r => ({
    id: r.id,
    status: r.status,
    type: r.type,
    staffName: r.staff.fullName,
    subjectName: r.sectionSubject.subject.name,
    sectionName: `${r.sectionSubject.section.gradeLevel.name} ${r.sectionSubject.section.name}`,
    proposedDayOfWeek: r.proposedDayOfWeek,
    proposedStartTime: r.proposedStartTime,
    proposedEndTime: r.proposedEndTime,
    proposedRoom: r.proposedRoom,
    alternativeDayOfWeek: r.alternativeDayOfWeek,
    alternativeStartTime: r.alternativeStartTime,
    alternativeEndTime: r.alternativeEndTime,
    alternativeRoom: r.alternativeRoom,
    reason: r.reason,
    reviewNote: r.reviewNote,
    createdAt: r.createdAt.toISOString(),
    reviewedAt: r.reviewedAt?.toISOString() || null,
    sectionSubjectId: r.sectionSubjectId
  }));
}

export async function approveScheduleRequest(requestId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const reviewerId = session.user.id;
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');
  await assertSchedulerAccess(tenant.id, session.user.id);

  const req = await prisma.scheduleRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new Error('Solicitud no encontrada');
  if (req.tenantId !== tenant.id) throw new Error('Solicitud fuera del tenant');
  if (req.status !== 'pending') return { success: false, error: 'La solicitud ya fue procesada.' };

  const targetSchedule = req.type === 'change'
    ? await prisma.classSchedule.findFirst({
      where: {
        tenantId: tenant.id,
        sectionSubjectId: req.sectionSubjectId
      },
      orderBy: { createdAt: 'asc' }
    })
    : null;

  const conflicts = await findScheduleConflicts({
    tenantId: tenant.id,
    dayOfWeek: req.proposedDayOfWeek,
    startTime: req.proposedStartTime,
    endTime: req.proposedEndTime,
    room: req.proposedRoom,
    staffId: req.staffId,
    ...(targetSchedule ? { excludeScheduleId: targetSchedule.id } : {})
  });
  if (conflicts.length > 0) return { success: false, error: conflicts[0].error };

  await prisma.$transaction(async (tx) => {
    if (req.type === 'new') {
      await tx.classSchedule.create({
        data: {
          tenantId: tenant.id,
          sectionSubjectId: req.sectionSubjectId,
          dayOfWeek: req.proposedDayOfWeek,
          startTime: req.proposedStartTime,
          endTime: req.proposedEndTime,
          room: req.proposedRoom
        }
      });
    } else {
      if (targetSchedule) {
        await tx.classSchedule.update({
          where: { id: targetSchedule.id },
          data: {
            dayOfWeek: req.proposedDayOfWeek,
            startTime: req.proposedStartTime,
            endTime: req.proposedEndTime,
            room: req.proposedRoom
          }
        });
      } else {
        await tx.classSchedule.create({
          data: {
            tenantId: tenant.id,
            sectionSubjectId: req.sectionSubjectId,
            dayOfWeek: req.proposedDayOfWeek,
            startTime: req.proposedStartTime,
            endTime: req.proposedEndTime,
            room: req.proposedRoom
          }
        });
      }
    }

    await tx.scheduleRequest.update({
      where: { id: req.id },
      data: {
        status: 'approved',
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNote: 'Aprobada'
      }
    });
  });

  safeRevalidate('/teacher');
  safeRevalidate(`/teacher/classes/${req.sectionSubjectId}`);
  safeRevalidate('/teacher/schedule');
  safeRevalidate('/admin/schedule-requests');
  safeRevalidate('/director/schedule-requests');

  return { success: true };
}

export async function rejectScheduleRequest(requestId: string, note: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');
  await assertSchedulerAccess(tenant.id, session.user.id);

  const req = await prisma.scheduleRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new Error('Solicitud no encontrada');
  if (req.tenantId !== tenant.id) throw new Error('Solicitud fuera del tenant');
  if (req.status !== 'pending') return { success: false, error: 'La solicitud ya fue procesada.' };

  await prisma.scheduleRequest.update({
    where: { id: requestId },
    data: {
      status: 'rejected',
      reviewedById: session.user.id,
      reviewedAt: new Date(),
      reviewNote: note?.trim() || 'Rechazada'
    }
  });

  safeRevalidate('/admin/schedule-requests');
  safeRevalidate('/director/schedule-requests');
  safeRevalidate(`/teacher/classes/${req.sectionSubjectId}`);
  return { success: true };
}

// ─────────────────────────────────────────────────────────────────────────
// Direct schedule management (admin/director) — unlike the teacher-facing
// request flow above, these write ClassSchedule immediately, no approval
// step. Same conflict checker so an admin can't create a clash either.
// ─────────────────────────────────────────────────────────────────────────

export async function getAllClassSchedules(tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const schedules = await prisma.classSchedule.findMany({
    where: { tenantId: tenant.id },
    include: {
      sectionSubject: {
        include: {
          subject: true,
          staff: true,
          section: { include: { gradeLevel: true } }
        }
      }
    },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }]
  });

  return schedules.map((s) => ({
    id: s.id,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    room: s.room,
    sectionSubjectId: s.sectionSubjectId,
    subjectName: s.sectionSubject.subject.name,
    sectionName: `${s.sectionSubject.section.gradeLevel.name} ${s.sectionSubject.section.name}`,
    teacherName: s.sectionSubject.staff?.fullName || 'Sin asignar'
  }));
}

async function assertSchedulerAccess(tenantId: string, userId: string) {
  // schedule:manage cubre la gestión directa de horarios (crear/editar/eliminar
  // bloques). Se mantiene el mensaje de error original porque la UI lo muestra
  // tal cual en vez de un código STABLE_ERROR.
  const ok = await hasPermission(tenantId, userId, 'schedule:manage');
  if (!ok) throw new Error('No autorizado para editar horarios');
}

export async function previewDirectScheduleConflict(
  sectionSubjectId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  room: string | null,
  excludeScheduleId?: string,
  tenantSlug?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');
  await assertSchedulerAccess(tenant.id, session.user.id);

  if (dayOfWeek < 1 || dayOfWeek > 6) return { ok: false, error: 'Día inválido.' };
  if (!isValidRange(startTime, endTime)) return { ok: false, error: 'La hora de inicio debe ser menor a la hora fin.' };

  const sectionSubject = await prisma.sectionSubject.findUnique({ where: { id: sectionSubjectId } });
  if (!sectionSubject || sectionSubject.tenantId !== tenant.id) return { ok: false, error: 'Clase no encontrada.' };
  if (!sectionSubject.staffId) return { ok: false, error: 'Esta clase no tiene docente asignado todavía.' };

  const conflicts = await findScheduleConflicts({
    tenantId: tenant.id,
    dayOfWeek,
    startTime,
    endTime,
    room,
    staffId: sectionSubject.staffId,
    excludeScheduleId
  });
  if (conflicts.length > 0) {
    return { ok: false, error: conflicts[0].error, conflictType: conflicts[0].conflictType, conflicts };
  }

  return { ok: true, message: 'Horario disponible. Sin choques detectados.' };
}

export async function createClassScheduleDirect(
  sectionSubjectId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  room: string | null,
  tenantSlug?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');
  await assertSchedulerAccess(tenant.id, session.user.id);

  if (dayOfWeek < 1 || dayOfWeek > 6) return { success: false, error: 'Día inválido.' };
  if (!isValidRange(startTime, endTime)) return { success: false, error: 'La hora de inicio debe ser menor a la hora fin.' };

  const sectionSubject = await prisma.sectionSubject.findUnique({ where: { id: sectionSubjectId } });
  if (!sectionSubject || sectionSubject.tenantId !== tenant.id) return { success: false, error: 'Clase no encontrada.' };
  if (!sectionSubject.staffId) return { success: false, error: 'Esta clase no tiene docente asignado todavía.' };

  const conflicts = await findScheduleConflicts({
    tenantId: tenant.id,
    dayOfWeek,
    startTime,
    endTime,
    room,
    staffId: sectionSubject.staffId
  });
  if (conflicts.length > 0) return { success: false, error: conflicts[0].error };

  await prisma.classSchedule.create({
    data: { tenantId: tenant.id, sectionSubjectId, dayOfWeek, startTime, endTime, room }
  });

  await prisma.activityEvent.create({
    data: {
      tenantId: tenant.id,
      actorUserId: session.user.id,
      entityType: 'classSchedule',
      entityId: sectionSubjectId,
      action: 'schedule_created_direct',
      metadata: JSON.stringify({ sectionSubjectId, dayOfWeek, startTime, endTime, room }),
      occurredAt: new Date()
    }
  });

  safeRevalidate('/admin/schedule');
  safeRevalidate('/teacher');
  safeRevalidate(`/teacher/classes/${sectionSubjectId}`);
  safeRevalidate('/teacher/schedule');
  return { success: true };
}

export async function updateClassScheduleDirect(
  scheduleId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  room: string | null,
  tenantSlug?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');
  await assertSchedulerAccess(tenant.id, session.user.id);

  if (dayOfWeek < 1 || dayOfWeek > 6) return { success: false, error: 'Día inválido.' };
  if (!isValidRange(startTime, endTime)) return { success: false, error: 'La hora de inicio debe ser menor a la hora fin.' };

  const schedule = await prisma.classSchedule.findUnique({
    where: { id: scheduleId },
    include: { sectionSubject: true }
  });
  if (!schedule || schedule.tenantId !== tenant.id) return { success: false, error: 'Horario no encontrado.' };
  if (!schedule.sectionSubject.staffId) return { success: false, error: 'Esta clase no tiene docente asignado todavía.' };

  const conflicts = await findScheduleConflicts({
    tenantId: tenant.id,
    dayOfWeek,
    startTime,
    endTime,
    room,
    staffId: schedule.sectionSubject.staffId,
    excludeScheduleId: scheduleId
  });
  if (conflicts.length > 0) return { success: false, error: conflicts[0].error };

  await prisma.classSchedule.update({
    where: { id: scheduleId },
    data: { dayOfWeek, startTime, endTime, room }
  });

  await prisma.activityEvent.create({
    data: {
      tenantId: tenant.id,
      actorUserId: session.user.id,
      entityType: 'classSchedule',
      entityId: schedule.sectionSubjectId,
      action: 'schedule_updated_direct',
      metadata: JSON.stringify({ scheduleId, dayOfWeek, startTime, endTime, room }),
      occurredAt: new Date()
    }
  });

  safeRevalidate('/admin/schedule');
  safeRevalidate('/teacher');
  safeRevalidate(`/teacher/classes/${schedule.sectionSubjectId}`);
  safeRevalidate('/teacher/schedule');
  return { success: true };
}

export async function deleteClassScheduleDirect(scheduleId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');
  await assertSchedulerAccess(tenant.id, session.user.id);

  const schedule = await prisma.classSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule || schedule.tenantId !== tenant.id) return { success: false, error: 'Horario no encontrado.' };

  await prisma.classSchedule.delete({ where: { id: scheduleId } });

  await prisma.activityEvent.create({
    data: {
      tenantId: tenant.id,
      actorUserId: session.user.id,
      entityType: 'classSchedule',
      entityId: schedule.sectionSubjectId,
      action: 'schedule_deleted_direct',
      metadata: JSON.stringify({ scheduleId }),
      occurredAt: new Date()
    }
  });

  safeRevalidate('/admin/schedule');
  safeRevalidate('/teacher');
  safeRevalidate(`/teacher/classes/${schedule.sectionSubjectId}`);
  safeRevalidate('/teacher/schedule');
  return { success: true };
}
