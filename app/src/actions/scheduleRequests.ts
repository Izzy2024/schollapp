'use server';

import { auth } from '@/auth';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

function formatSlot(day: number, start: string, end: string, room?: string | null) {
  return `${day}|${start}|${end}|${room || ''}`;
}

function timeToMinutes(value: string) {
  const [h, m] = value.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

function overlaps(startA: string, endA: string, startB: string, endB: string) {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  if (aStart < 0 || aEnd < 0 || bStart < 0 || bEnd < 0) return false;
  return aStart < bEnd && bStart < aEnd;
}

function isValidRange(start: string, end: string) {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);
  return startMinutes >= 0 && endMinutes >= 0 && startMinutes < endMinutes;
}

function minutesToTime(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function normalizeDay(day: number) {
  const base = ((day - 1) % 6 + 6) % 6;
  return base + 1;
}

type ScheduleConflict = {
  conflictType: 'teacher' | 'room';
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  subjectName: string;
  sectionName: string;
  teacherName: string;
  error: string;
};

type ScheduleSuggestion = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  note: string;
};

export async function findScheduleConflicts({
  tenantId,
  dayOfWeek,
  startTime,
  endTime,
  room,
  staffId,
  excludeScheduleId,
  excludeSectionSubjectId
}: {
  tenantId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string | null;
  staffId: string;
  excludeScheduleId?: string;
  excludeSectionSubjectId?: string;
}) {
  const conflicts: ScheduleConflict[] = [];

  const teacherSchedulesSameDay = await prisma.classSchedule.findMany({
    where: {
      tenantId,
      dayOfWeek,
      ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
      sectionSubject: {
        staffId,
        ...(excludeSectionSubjectId ? { id: { not: excludeSectionSubjectId } } : {})
      }
    },
    include: {
      sectionSubject: {
        include: {
          subject: true,
          section: { include: { gradeLevel: true } }
        }
      }
    }
  });

  const teacherConflict = teacherSchedulesSameDay.find((s) => overlaps(
    startTime,
    endTime,
    s.startTime,
    s.endTime
  ));

  if (teacherConflict) {
    const subjectName = teacherConflict.sectionSubject.subject.name;
    const sectionName = `${teacherConflict.sectionSubject.section.gradeLevel.name} ${teacherConflict.sectionSubject.section.name}`;
    const conflictLabel = `${subjectName} (${sectionName}) ${teacherConflict.startTime}-${teacherConflict.endTime}`;
    conflicts.push({
      conflictType: 'teacher',
      dayOfWeek: teacherConflict.dayOfWeek,
      startTime: teacherConflict.startTime,
      endTime: teacherConflict.endTime,
      room: teacherConflict.room,
      subjectName,
      sectionName,
      teacherName: 'Tu horario',
      error: `Choque de horario detectado con: ${conflictLabel}`
    });
  }

  const normalizedRoom = room?.trim().toLowerCase();
  if (!normalizedRoom) return conflicts;

  const roomSchedulesSameDay = await prisma.classSchedule.findMany({
    where: {
      tenantId,
      dayOfWeek,
      room: { not: null },
      ...(excludeScheduleId ? { id: { not: excludeScheduleId } } : {}),
      ...(excludeSectionSubjectId ? { sectionSubjectId: { not: excludeSectionSubjectId } } : {})
    },
    include: {
      sectionSubject: {
        include: {
          subject: true,
          section: { include: { gradeLevel: true } },
          staff: true
        }
      }
    }
  });

  const roomConflict = roomSchedulesSameDay.find((s) => {
    const normalizedExistingRoom = s.room?.trim().toLowerCase();
    if (!normalizedExistingRoom || normalizedExistingRoom !== normalizedRoom) return false;
    return overlaps(startTime, endTime, s.startTime, s.endTime);
  });

  if (roomConflict) {
    const subjectName = roomConflict.sectionSubject.subject.name;
    const sectionName = `${roomConflict.sectionSubject.section.gradeLevel.name} ${roomConflict.sectionSubject.section.name}`;
    const teacherName = roomConflict.sectionSubject.staff?.fullName || 'otro docente';
    const roomConflictLabel = `${roomConflict.room} - ${subjectName} (${sectionName}) ${roomConflict.startTime}-${roomConflict.endTime} (${teacherName})`;
    conflicts.push({
      conflictType: 'room',
      dayOfWeek: roomConflict.dayOfWeek,
      startTime: roomConflict.startTime,
      endTime: roomConflict.endTime,
      room: roomConflict.room,
      subjectName,
      sectionName,
      teacherName,
      error: `Choque de aula detectado con: ${roomConflictLabel}`
    });
  }

  return conflicts;
}

async function findNearbyScheduleSuggestions({
  tenantId,
  dayOfWeek,
  startTime,
  endTime,
  room,
  staffId,
  excludeScheduleId,
  excludeSectionSubjectId
}: {
  tenantId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room?: string | null;
  staffId: string;
  excludeScheduleId?: string;
  excludeSectionSubjectId?: string;
}) {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const duration = endMinutes - startMinutes;
  if (startMinutes < 0 || endMinutes < 0 || duration <= 0) return [] as ScheduleSuggestion[];

  const minDayMinute = 7 * 60; // 07:00
  const maxDayMinute = 19 * 60; // 19:00
  const dayOffsets = [0, 1, -1, 2, -2];
  const timeOffsets = [0, 30, -30, 60, -60, 90, -90, 120, -120];
  const seen = new Set<string>();
  const candidates: Array<{ day: number; start: string; end: string; score: number; note: string }> = [];

  for (const dayOffset of dayOffsets) {
    const candidateDay = normalizeDay(dayOfWeek + dayOffset);
    for (const timeOffset of timeOffsets) {
      const candidateStartMin = startMinutes + timeOffset;
      const candidateEndMin = candidateStartMin + duration;
      if (candidateStartMin < minDayMinute || candidateEndMin > maxDayMinute) continue;

      const candidateStart = minutesToTime(candidateStartMin);
      const candidateEnd = minutesToTime(candidateEndMin);
      const key = `${candidateDay}|${candidateStart}|${candidateEnd}|${room || ''}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const conflict = await findScheduleConflicts({
        tenantId,
        dayOfWeek: candidateDay,
        startTime: candidateStart,
        endTime: candidateEnd,
        room,
        staffId,
        excludeScheduleId,
        excludeSectionSubjectId
      });
      if (conflict.length > 0) continue;

      const score = Math.abs(dayOffset) * 1000 + Math.abs(timeOffset);
      const note = dayOffset === 0
        ? 'Mismo día'
        : dayOffset > 0
          ? `${dayOffset} día(s) después`
          : `${Math.abs(dayOffset)} día(s) antes`;

      candidates.push({
        day: candidateDay,
        start: candidateStart,
        end: candidateEnd,
        score,
        note
      });
    }
  }

  return candidates
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((c) => ({
      dayOfWeek: c.day,
      startTime: c.start,
      endTime: c.end,
      room: room?.trim() || null,
      note: c.note
    }));
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

  revalidatePath('/teacher');
  revalidatePath(`/teacher/classes/${sectionSubjectId}`);
  revalidatePath('/admin/schedule-requests');
  revalidatePath('/director/schedule-requests');

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

  revalidatePath('/teacher');
  revalidatePath(`/teacher/classes/${req.sectionSubjectId}`);
  revalidatePath('/teacher/schedule');
  revalidatePath('/admin/schedule-requests');
  revalidatePath('/director/schedule-requests');

  return { success: true };
}

export async function rejectScheduleRequest(requestId: string, note: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

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

  revalidatePath('/admin/schedule-requests');
  revalidatePath('/director/schedule-requests');
  revalidatePath(`/teacher/classes/${req.sectionSubjectId}`);
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

function assertSchedulerAccess(user: { role?: string | null; roles?: string[] | null }) {
  const role = user.role ?? undefined;
  const roles = user.roles ?? [];
  if (role === 'admin' || role === 'director') return;
  if (roles.includes('admin') || roles.includes('director')) return;
  throw new Error('No autorizado para editar horarios');
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
  assertSchedulerAccess(session.user);
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

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
  assertSchedulerAccess(session.user);
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

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

  revalidatePath('/admin/schedule');
  revalidatePath('/teacher');
  revalidatePath(`/teacher/classes/${sectionSubjectId}`);
  revalidatePath('/teacher/schedule');
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
  assertSchedulerAccess(session.user);
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

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

  revalidatePath('/admin/schedule');
  revalidatePath('/teacher');
  revalidatePath(`/teacher/classes/${schedule.sectionSubjectId}`);
  revalidatePath('/teacher/schedule');
  return { success: true };
}

export async function deleteClassScheduleDirect(scheduleId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  assertSchedulerAccess(session.user);
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

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

  revalidatePath('/admin/schedule');
  revalidatePath('/teacher');
  revalidatePath(`/teacher/classes/${schedule.sectionSubjectId}`);
  revalidatePath('/teacher/schedule');
  return { success: true };
}
