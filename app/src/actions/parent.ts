'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { getForParent } from '@/actions/finance/statements';

export async function getParentDashboardData(tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });

  if (!tenant) throw new Error('Tenant not found');

  const guardian = await prisma.guardian.findFirst({
    where: { tenantId: tenant.id, email: session.user.email },
  });

  const links = guardian
    ? await prisma.studentGuardian.findMany({
        where: { tenantId: tenant.id, guardianId: guardian.id },
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              enrollments: {
                where: { status: 'enrolled' },
                include: { section: { include: { gradeLevel: true } } },
                take: 1,
              },
            },
          },
        },
      })
    : [];

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const children = await Promise.all(
    links.map(async (link) => {
      const student = link.student;
      const enrollment = student.enrollments[0];

      const [totalRecords, presentRecords, todayRecord] = await Promise.all([
        prisma.attendanceRecord.count({
          where: { tenantId: tenant.id, studentId: student.id, attendanceSession: { date: { gte: startOfMonth } } },
        }),
        prisma.attendanceRecord.count({
          where: { tenantId: tenant.id, studentId: student.id, status: 'present', attendanceSession: { date: { gte: startOfMonth } } },
        }),
        prisma.attendanceRecord.findFirst({
          where: { tenantId: tenant.id, studentId: student.id, attendanceSession: { date: { gte: todayStart } } },
          select: { status: true },
        }),
      ]);

      const attendancePct = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : null;
      const statusLabels: Record<string, string> = {
        present: 'Presente',
        absent: 'Ausente',
        late: 'Retardo',
        excused: 'Falta Justificada',
      };

      return {
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        grade: enrollment?.section ? `${enrollment.section.gradeLevel.name} - ${enrollment.section.name}` : 'Sin inscripción activa',
        status: todayRecord ? statusLabels[todayRecord.status] || todayRecord.status : 'Sin registro hoy',
        attendance: attendancePct === null ? '—' : `${attendancePct}%`,
      };
    })
  );

  const statement = await getForParent().catch(() => null);
  const balanceDueCents = statement?.totals?.balanceDueCents ?? 0;

  return {
    parentName: guardian?.fullName || 'Familia',
    children,
    financial: {
      balanceDueCents,
      upcomingCharges: [],
    },
  };
}
