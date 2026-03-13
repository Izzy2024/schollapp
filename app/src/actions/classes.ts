'use server';

import { auth } from '@/auth';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getClassDetail(sectionSubjectId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  if (!sectionSubjectId?.trim()) throw new Error('sectionSubjectId requerido');

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const ss = await prisma.sectionSubject.findUnique({
    where: { id: sectionSubjectId },
    include: {
      subject: true,
      section: {
        include: { gradeLevel: true, enrollments: { where: { status: 'enrolled' } } }
      },
      staff: true,
      evaluations: { include: { records: true } },
      schedules: { orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }] },
      scheduleRequests: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  if (!ss) throw new Error('Clase no encontrada');

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      sectionId: ss.sectionId,
      date: { gte: startOfMonth }
    },
    include: { records: true }
  });

  let presentCount = 0;
  let totalRecords = 0;
  sessions.forEach(session => {
    session.records.forEach(r => {
      totalRecords++;
      if (r.status === 'present' || r.status === 'late' || r.status === 'excused') {
        presentCount++;
      }
    });
  });

  const monthlyAttendancePct = totalRecords === 0 ? 100 : Math.round((presentCount / totalRecords) * 100);

  let gradeSum = 0;
  let gradeCount = 0;
  ss.evaluations.forEach(ev => {
    ev.records.forEach(r => {
      gradeSum += r.score;
      gradeCount++;
    });
  });

  const groupAverage = gradeCount === 0 ? 0 : Math.round(gradeSum / gradeCount);

  return {
    id: ss.id,
    subjectName: ss.subject?.name || 'Materia',
    gradeLevel: ss.section?.gradeLevel?.name || '',
    sectionName: ss.section?.name || '',
    teacherName: ss.staff?.fullName || 'Docente',
    teacherRole: ss.staff?.roleLabel || 'Docente',
    schedules: ss.schedules.map(s => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room
    })),
    latestScheduleRequest: ss.scheduleRequests[0] ? {
      id: ss.scheduleRequests[0].id,
      type: ss.scheduleRequests[0].type,
      status: ss.scheduleRequests[0].status,
      createdAt: ss.scheduleRequests[0].createdAt.toISOString()
    } : null,
    stats: {
      studentCount: ss.section.enrollments.length,
      monthlyAttendancePct,
      groupAverage
    }
  };
}

export async function getClassStudents(sectionSubjectId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  if (!sectionSubjectId?.trim()) throw new Error('sectionSubjectId requerido');

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const ss = await prisma.sectionSubject.findUnique({
    where: { id: sectionSubjectId },
    include: {
      section: {
        include: { enrollments: { where: { status: 'enrolled' }, include: { student: true } } }
      },
      evaluations: { include: { records: true } }
    }
  });

  if (!ss) throw new Error('Clase no encontrada');

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const sessions = await prisma.attendanceSession.findMany({
    where: {
      sectionId: ss.sectionId,
      date: { gte: startOfMonth }
    },
    include: { records: true }
  });

  return ss.section.enrollments.map(e => {
    const st = e.student;
    
    // Attendance
    let presentCount = 0;
    let totalSessions = sessions.length;
    sessions.forEach(session => {
      const rec = session.records.find(r => r.studentId === st.id);
      if (rec && (rec.status === 'present' || rec.status === 'late' || rec.status === 'excused')) {
        presentCount++;
      }
    });
    const monthlyAttendancePct = totalSessions === 0 ? 100 : Math.round((presentCount / totalSessions) * 100);

    // Current Average
    let gradeSum = 0;
    let gradeCount = 0;
    ss.evaluations.forEach(ev => {
      const g = ev.records.find(gr => gr.studentId === st.id);
      if (g) {
        gradeSum += g.score;
        gradeCount++;
      }
    });
    const currentAverage = gradeCount === 0 ? 0 : Math.round(gradeSum / gradeCount);

    return {
      id: st.id,
      name: `${st.firstName} ${st.lastName}`,
      studentCode: st.studentCode || '',
      monthlyAttendancePct,
      currentAverage,
      status: st.status
    };
  });
}

export async function getClassAttendanceHistory(sectionSubjectId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  if (!sectionSubjectId?.trim()) throw new Error('sectionSubjectId requerido');

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const ss = await prisma.sectionSubject.findUnique({
    where: { id: sectionSubjectId }
  });

  if (!ss) throw new Error('Clase no encontrada');

  const sessions = await prisma.attendanceSession.findMany({
    where: { sectionId: ss.sectionId },
    orderBy: { date: 'desc' },
    take: 20,
    include: { records: true }
  });

  return sessions.map(session => {
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let excusedCount = 0;

    session.records.forEach(r => {
      if (r.status === 'present') presentCount++;
      else if (r.status === 'absent') absentCount++;
      else if (r.status === 'late') lateCount++;
      else if (r.status === 'excused') excusedCount++;
    });

    return {
      id: session.id,
      date: session.date,
      presentCount,
      absentCount,
      lateCount,
      excusedCount,
      totalCount: session.records.length
    };
  });
}
