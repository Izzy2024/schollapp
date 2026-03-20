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

  // Fetch up to 2 active students to simulate children for the Parent Dashboard MVP
  const students = await prisma.student.findMany({
    where: { tenantId: tenant.id, status: 'active' },
    take: 2,
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  // Real financial snapshot (tenant-scoped + RBAC via session)
  const statement = await getForParent().catch(() => null);
  const balanceDueCents = statement?.totals?.balanceDueCents ?? 0;

  return {
    parentName: 'Familia',
    children:
      students.length > 0
        ? students.map((s, idx) => ({
            id: s.id,
            name: `${s.firstName} ${s.lastName}`,
            grade: idx === 0 ? '3° Secundaria' : '1° Primaria',
            status: idx === 0 ? 'Presente' : 'Falta Justificada',
            attendance: idx === 0 ? '98%' : '85%',
          }))
        : [{ id: '1', name: 'Estudiante Demo', grade: '3° Secundaria', status: 'Presente', attendance: '98%' }],
    financial: {
      balanceDueCents,
      upcomingCharges: [],
    },
  };
}
