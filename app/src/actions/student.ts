'use server';

import { auth } from '@/auth';

import prisma from '@/lib/prisma';

export async function getStudentDashboardData(tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });

  if (!tenant) throw new Error('Tenant not found');

  const student = await prisma.student.findFirst({
    where: { tenantId: tenant.id, email: session.user.email, status: 'active' },
    select: { id: true, firstName: true, lastName: true, studentCode: true },
  });

  if (!student) {
    return {
      studentInfo: { name: 'Sin perfil de alumno vinculado', code: '', grade: '' },
      subjects: [],
      notifications: [],
    };
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: { tenantId: tenant.id, studentId: student.id, status: 'enrolled' },
    include: { section: { include: { gradeLevel: true } } },
  });

  const sectionSubjects = enrollment?.sectionId
    ? await prisma.sectionSubject.findMany({
        where: { tenantId: tenant.id, sectionId: enrollment.sectionId },
        include: {
          subject: true,
          staff: { select: { fullName: true } },
          evaluations: {
            include: { records: { where: { studentId: student.id } } },
          },
        },
      })
    : [];

  const subjects = sectionSubjects.map((ss) => {
    const scores = ss.evaluations
      .map((ev) => ev.records[0]?.score)
      .filter((s): s is number => typeof s === 'number');
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
    const status = avg === null ? 'pending' : avg >= 9 ? 'excellent' : avg >= 7 ? 'good' : 'warning';

    return {
      id: ss.id,
      name: ss.subject.name,
      grade: avg === null ? null : Math.round(avg * 10) / 10,
      status,
      teacher: ss.staff?.fullName || 'Sin asignar',
    };
  });

  const upcomingEvaluations = enrollment?.sectionId
    ? await prisma.evaluation.findMany({
        where: { tenantId: tenant.id, sectionSubject: { sectionId: enrollment.sectionId }, date: { gte: new Date() } },
        include: { sectionSubject: { include: { subject: true } } },
        orderBy: { date: 'asc' },
        take: 3,
      })
    : [];

  return {
    studentInfo: {
      name: `${student.firstName} ${student.lastName}`,
      code: student.studentCode || '',
      grade: enrollment?.section ? `${enrollment.section.gradeLevel.name} - ${enrollment.section.name}` : 'Sin inscripción activa',
    },
    subjects,
    notifications: upcomingEvaluations.map((ev) => ({
      id: ev.id,
      title: ev.name,
      desc: `${ev.sectionSubject.subject.name} · ${ev.date.toLocaleDateString('es')}`,
      type: 'warning' as const,
    })),
  };
}

type ActivityEvent = { title: string; time: string; color: string };

const ATTENDANCE_EVENT: Record<string, ActivityEvent> = {
  present: { title: 'Presente en Clase', time: '', color: 'green' },
  absent: { title: 'Falta a Clase', time: '', color: 'orange' },
  late: { title: 'Llegada Tarde', time: '', color: 'red' },
  excused: { title: 'Falta Justificada', time: '', color: 'cyan' },
};

// ponytail: reads AttendanceRecord/Submission/GradeRecord/Evaluation directly instead of
// a generic ActivityEvent feed — attendance/gradebook/submissions don't emit ActivityEvent
// today, and retrofitting that is a bigger change than this per-student calendar needs.
export async function getStudentActivityCalendar(year: number, month: number, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const student = await prisma.student.findFirst({
    where: { tenantId: tenant.id, email: session.user.email, status: 'active' },
    select: { id: true },
  });

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const byDay = new Map<number, ActivityEvent[]>();
  const push = (date: Date, event: ActivityEvent) => {
    const day = date.getDate();
    const list = byDay.get(day) ?? [];
    list.push(event);
    byDay.set(day, list);
  };

  if (student) {
    const enrollment = await prisma.enrollment.findFirst({
      where: { tenantId: tenant.id, studentId: student.id, status: { in: ['enrolled', 'reenrolled'] } },
    });

    const [attendanceRecords, submissions, gradeRecords, dueEvaluations] = await Promise.all([
      prisma.attendanceRecord.findMany({
        where: { tenantId: tenant.id, studentId: student.id, attendanceSession: { date: { gte: monthStart, lt: monthEnd } } },
        include: { attendanceSession: true },
      }),
      prisma.submission.findMany({
        where: { tenantId: tenant.id, studentId: student.id, submittedAt: { gte: monthStart, lt: monthEnd } },
        include: { evaluation: true },
      }),
      prisma.gradeRecord.findMany({
        where: { tenantId: tenant.id, studentId: student.id, createdAt: { gte: monthStart, lt: monthEnd } },
        include: { evaluation: { include: { sectionSubject: { include: { subject: true } } } } },
      }),
      enrollment?.sectionId
        ? prisma.evaluation.findMany({
            where: { tenantId: tenant.id, sectionSubject: { sectionId: enrollment.sectionId }, dueDate: { gte: monthStart, lt: monthEnd } },
          })
        : Promise.resolve([]),
    ]);

    for (const rec of attendanceRecords) {
      const template = ATTENDANCE_EVENT[rec.status];
      if (template) push(rec.attendanceSession.date, { ...template, time: rec.attendanceSession.date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) });
    }
    for (const sub of submissions) {
      if (!sub.submittedAt) continue;
      push(sub.submittedAt, { title: `Tarea Enviada: ${sub.evaluation.name}`, time: sub.submittedAt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }), color: 'blue' });
    }
    for (const gr of gradeRecords) {
      push(gr.createdAt, { title: `Calificación Publicada: ${gr.evaluation.name}`, time: gr.createdAt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }), color: 'purple' });
    }
    for (const ev of dueEvaluations) {
      if (!ev.dueDate) continue;
      push(ev.dueDate, { title: `Tarea Pendiente: ${ev.name}`, time: 'Fecha límite', color: 'red' });
    }
  }

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dayOfWeek = new Date(year, month, day).getDay();
    return {
      day,
      isToday: isCurrentMonth && today.getDate() === day,
      label: dayOfWeek === 0 || dayOfWeek === 6 ? 'Fin de semana' : undefined,
      events: byDay.get(day) ?? [],
    };
  });
}
