'use server';

import { auth } from '@/auth';

import prisma from '@/lib/prisma';

export async function getTeacherWeeklySchedule(tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenantSlugSession = session.user.tenantSlug;
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug || tenantSlugSession } });
  if (!tenant) throw new Error('Tenant not found');

  const teacher = await prisma.staff.findFirst({
    where: {
      tenantId: tenant.id,
      userId: session.user.id,
    }
  });

  if (!teacher) return [];

  const schedules = await prisma.classSchedule.findMany({
    where: {
      tenantId: tenant.id,
      sectionSubject: { staffId: teacher.id }
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

  const flatSchedule = schedules.map(s => ({
    id: s.id,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    room: s.room,
    subjectName: s.sectionSubject.subject.name,
    sectionName: `${s.sectionSubject.section.gradeLevel.name} - ${s.sectionSubject.section.name}`,
    sectionSubjectId: s.sectionSubjectId
  }));

  return flatSchedule;
}
