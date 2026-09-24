import prisma from '@/lib/prisma';

export function formatSlot(day: number, start: string, end: string, room?: string | null) {
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

export function isValidRange(start: string, end: string) {
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

export async function findNearbyScheduleSuggestions({
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

  const minDayMinute = 7 * 60;
  const maxDayMinute = 19 * 60;
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
