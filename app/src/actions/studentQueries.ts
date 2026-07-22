'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function getCurrentStudent() {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenant = await prisma.tenant.findUnique({ where: { slug: session.user.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  // For student users, resolve student record from their user ID
  const student = await prisma.student.findFirst({
    where: { tenantId: tenant.id, email: session.user.email, status: 'active' },
    select: { id: true, firstName: true, lastName: true, studentCode: true },
  });

  return student;
}

export async function getStudentSchedule() {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenant = await prisma.tenant.findUnique({ where: { slug: session.user.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  // Get student's section via enrollment
  const student = await prisma.student.findFirst({
    where: { tenantId: tenant.id, email: session.user.email, status: 'active' },
  });
  if (!student) return [];

  const enrollment = await prisma.enrollment.findFirst({
    where: { tenantId: tenant.id, studentId: student.id, status: 'enrolled' },
  });
  if (!enrollment?.sectionId) return [];

  // Get all SectionSubjects for this section with schedules
  const sectionSubjects = await prisma.sectionSubject.findMany({
    where: { tenantId: tenant.id, sectionId: enrollment.sectionId },
    include: {
      subject: true,
      section: { include: { gradeLevel: true } },
      staff: { select: { fullName: true } },
      schedules: true,
    },
  });

  return sectionSubjects.flatMap(ss =>
    ss.schedules.map(s => ({
      id: s.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room,
      subjectName: ss.subject.name,
      sectionName: `${ss.section.gradeLevel.name} ${ss.section.name}`,
      teacherName: ss.staff?.fullName || 'Sin asignar',
    }))
  );
}

export async function getStudentExams() {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenant = await prisma.tenant.findUnique({ where: { slug: session.user.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const student = await prisma.student.findFirst({
    where: { tenantId: tenant.id, email: session.user.email, status: 'active' },
  });
  if (!student) return [];

  const enrollment = await prisma.enrollment.findFirst({
    where: { tenantId: tenant.id, studentId: student.id, status: 'enrolled' },
  });
  if (!enrollment?.sectionId) return [];

  const sectionSubjects = await prisma.sectionSubject.findMany({
    where: { tenantId: tenant.id, sectionId: enrollment.sectionId },
    include: {
      subject: true,
      staff: { select: { fullName: true } },
      evaluations: {
        include: { records: { where: { studentId: student.id } } },
        orderBy: { date: 'asc' },
      },
    },
  });

  return sectionSubjects.flatMap(ss =>
    ss.evaluations.map(ev => ({
      id: ev.id,
      name: ev.name,
      type: ev.type,
      date: ev.date.toISOString(),
      maxScore: ev.maxScore,
      subjectName: ss.subject.name,
      teacherName: ss.staff?.fullName || '',
      score: ev.records[0]?.score ?? null,
    }))
  );
}

export async function getStudentGrades() {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenant = await prisma.tenant.findUnique({ where: { slug: session.user.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const student = await prisma.student.findFirst({
    where: { tenantId: tenant.id, email: session.user.email, status: 'active' },
  });
  if (!student) return [];

  // Get all grade records for this student
  const records = await prisma.gradeRecord.findMany({
    where: { tenantId: tenant.id, studentId: student.id },
    include: {
      evaluation: {
        include: {
          sectionSubject: {
            include: { subject: true },
          },
        },
      },
    },
    orderBy: { evaluation: { date: 'desc' } },
  });

  return records.map(r => ({
    id: r.id,
    score: r.score,
    maxScore: r.evaluation.maxScore,
    evaluationName: r.evaluation.name,
    type: r.evaluation.type,
    subjectName: r.evaluation.sectionSubject.subject.name,
    date: r.evaluation.date.toISOString(),
  }));
}

export async function getStudentPeers() {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenant = await prisma.tenant.findUnique({ where: { slug: session.user.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const student = await prisma.student.findFirst({ where: { tenantId: tenant.id, email: session.user.email, status: 'active' } });
  if (!student) return { peers: [], sectionName: '' };

  const enrollment = await prisma.enrollment.findFirst({
    where: { tenantId: tenant.id, studentId: student.id, status: 'enrolled' },
    include: { section: { include: { gradeLevel: true } } },
  });
  if (!enrollment) return { peers: [], sectionName: '' };

  const sectionPeers = await prisma.enrollment.findMany({
    where: { tenantId: tenant.id, sectionId: enrollment.sectionId, status: 'enrolled' },
    include: { student: { select: { id: true, firstName: true, lastName: true, studentCode: true } } },
    orderBy: { student: { lastName: 'asc' } },
  });

  return {
    peers: sectionPeers.map(e => e.student),
    sectionName: `${enrollment.section.gradeLevel.name} — Sección "${enrollment.section.name}"`,
  };
}

export async function getStudentClassPrep() {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenant = await prisma.tenant.findUnique({ where: { slug: session.user.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const student = await prisma.student.findFirst({ where: { tenantId: tenant.id, email: session.user.email, status: 'active' } });
  if (!student) return [];

  const enrollment = await prisma.enrollment.findFirst({
    where: { tenantId: tenant.id, studentId: student.id, status: 'enrolled' },
  });
  if (!enrollment?.sectionId) return [];

  const sectionSubjects = await prisma.sectionSubject.findMany({
    where: { tenantId: tenant.id, sectionId: enrollment.sectionId },
    include: {
      subject: true,
      staff: { select: { fullName: true } },
      curricularUnits: { include: { topics: { orderBy: { order: 'asc' } } }, orderBy: { order: 'asc' } },
    },
  });

  return sectionSubjects.map(ss => ({
    id: ss.id,
    subjectName: ss.subject.name,
    teacherName: ss.staff?.fullName || '',
    units: ss.curricularUnits.map(u => ({
      id: u.id,
      title: u.name,
      startDate: u.startDate?.toISOString() || null,
      endDate: u.endDate?.toISOString() || null,
      topics: u.topics.map(t => ({ id: t.id, title: t.name, date: t.date?.toISOString() || null })),
    })),
  }));
}

export async function getStudentCalendarEvents() {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const tenant = await prisma.tenant.findUnique({ where: { slug: session.user.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const events = await prisma.schoolCalendarEvent.findMany({
    where: { tenantId: tenant.id },
    orderBy: { startAt: 'asc' },
  });

  return events.map(e => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startDate: e.startAt.toISOString(),
    endDate: e.endAt?.toISOString() || null,
    type: 'event' as const,
  }));
}
