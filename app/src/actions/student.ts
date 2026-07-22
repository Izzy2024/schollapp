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
