'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

export async function getTeacherStudentsData(sectionSubjectId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  
  const tenantSlugSession = session.user.tenantSlug;
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug || tenantSlugSession } });
  if (!tenant) throw new Error('Tenant not found');

  const teacher = await prisma.staff.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id }
  });
  if (!teacher) throw new Error('Teacher profile not found');

  if (!sectionSubjectId) return [];

  const ss = await prisma.sectionSubject.findUnique({
    where: { id: sectionSubjectId },
    include: {
      section: {
        include: {
          enrollments: {
            where: { status: 'enrolled' },
            include: {
              student: true
            }
          }
        }
      }
    }
  });

  if (!ss) throw new Error('Clase no encontrada');
  if (ss.staffId !== teacher.id) throw new Error('Unauthorized (Not your class)');

  const students = ss.section.enrollments.map(e => ({
    id: e.student.id,
    enrollmentId: e.student.studentCode,
    firstName: e.student.firstName,
    lastName: e.student.lastName,
    curp: e.student.nationalId || '',
    email: e.student.email,
  }));

  // Ordenar alfabéticamente
  students.sort((a, b) => {
    if (a.lastName === b.lastName) return a.firstName.localeCompare(b.firstName);
    return a.lastName.localeCompare(b.lastName);
  });

  return students;
}
