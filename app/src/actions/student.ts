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

  // We find an active student to act as our demo student
  const student = await prisma.student.findFirst({
    where: { tenantId: tenant.id, status: 'active' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      studentCode: true,
    }
  });

  return {
    studentInfo: {
      name: student ? `${student.firstName} ${student.lastName}` : 'Estudiante Demo',
      code: student?.studentCode || 'STD-001',
      grade: '1° A - Secundaria'
    },
    subjects: [
      { id: 1, name: 'Matemáticas Avanzadas', grade: 9.2, status: 'excellent', teacher: 'Prof. Gómez' },
      { id: 2, name: 'Física', grade: 7.8, status: 'warning', teacher: 'Prof. Salazar' },
      { id: 3, name: 'Literatura', grade: 8.5, status: 'good', teacher: 'Prof. López' },
    ],
    notifications: [
      { id: 1, title: 'Examen de Física', desc: 'Mañana, 09:00 AM', type: 'warning' },
      { id: 2, title: 'Nueva Tarea: Literatura', desc: 'Ensayo Capítulo 4', type: 'info' },
    ]
  };
}
