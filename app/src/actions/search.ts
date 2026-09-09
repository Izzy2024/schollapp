'use server';

import prisma from '@/lib/prisma';
import { auth } from '@/auth';
import { getPrimaryRole } from '@/lib/nav/menu';

export type SearchResult = {
  id: string;
  kind: 'student' | 'staff';
  title: string;
  subtitle: string;
  href: string;
};

/**
 * Buscador del header. No crea pantallas nuevas: el resultado muestra en línea
 * lo que normalmente se busca (grado/sección de un alumno, rol de un docente) y
 * enlaza a la pantalla del propio rol donde ya se ve ese dato.
 *
 * Un query vacío solo responde si el rol tiene algo que buscar, para que el
 * layout sepa si esconder la caja.
 */
export async function globalSearch(query: string): Promise<{ enabled: boolean; results: SearchResult[] }> {
  const session = await auth();
  if (!session?.user?.id) return { enabled: false, results: [] };

  const user = session.user as { id: string; tenantSlug?: string; tenantId?: string; roles?: string[] };
  const tenantKey = user.tenantSlug ?? user.tenantId;
  if (!tenantKey) return { enabled: false, results: [] };

  const role = getPrimaryRole(user.roles ?? []);
  // Padres y alumnos no administran directorio: su información ya está en su propio panel.
  const enabled = role === 'admin' || role === 'director' || role === 'teacher';
  if (!enabled) return { enabled: false, results: [] };

  const q = query.trim();
  if (q.length < 2) return { enabled, results: [] };

  const tenant = await prisma.tenant.findFirst({
    where: { OR: [{ slug: tenantKey }, { id: tenantKey }] },
    select: { id: true },
  });
  if (!tenant) return { enabled, results: [] };

  const tenantId = tenant.id;

  // Docente: solo alumnos de las secciones que imparte.
  let sectionIdFilter: string[] | null = null;
  if (role === 'teacher') {
    const staff = await prisma.staff.findFirst({ where: { tenantId, userId: user.id }, select: { id: true } });
    const sectionSubjects = staff
      ? await prisma.sectionSubject.findMany({ where: { tenantId, staffId: staff.id }, select: { sectionId: true } })
      : [];
    sectionIdFilter = [...new Set(sectionSubjects.map((s) => s.sectionId))];
    if (sectionIdFilter.length === 0) return { enabled, results: [] };
  }

  const students = await prisma.student.findMany({
    where: {
      tenantId,
      OR: [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { studentCode: { contains: q, mode: 'insensitive' } },
      ],
      ...(sectionIdFilter ? { enrollments: { some: { sectionId: { in: sectionIdFilter } } } } : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      studentCode: true,
      status: true,
      enrollments: {
        orderBy: { enrolledAt: 'desc' },
        take: 1,
        select: { section: { select: { name: true, gradeLevel: { select: { name: true } } } } },
      },
    },
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    take: 8,
  });

  const studentHref = (id: string) =>
    role === 'admin' ? `/admin/students/${id}` : role === 'director' ? '/director/enrollment' : '/teacher/students';

  const results: SearchResult[] = students.map((s) => {
    const section = s.enrollments[0]?.section;
    const where = section ? `${section.gradeLevel.name} ${section.name}` : 'Sin sección';
    return {
      id: s.id,
      kind: 'student' as const,
      title: `${s.lastName} ${s.firstName}`,
      subtitle: `${s.studentCode ?? 'Sin código'} · ${where}${s.status !== 'active' ? ' · Inactivo' : ''}`,
      href: studentHref(s.id),
    };
  });

  // Personal: solo lo ve quien administra el directorio.
  if (role === 'admin' || role === 'director') {
    const staff = await prisma.staff.findMany({
      where: { tenantId, OR: [{ fullName: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] },
      select: { id: true, fullName: true, roleLabel: true, email: true, isActive: true },
      orderBy: { fullName: 'asc' },
      take: 5,
    });

    for (const s of staff) {
      results.push({
        id: s.id,
        kind: 'staff',
        title: s.fullName,
        subtitle: `${s.roleLabel ?? 'Personal'}${s.email ? ` · ${s.email}` : ''}${s.isActive ? '' : ' · Inactivo'}`,
        href: role === 'admin' ? '/admin/staff' : '/director/staff',
      });
    }
  }

  return { enabled, results };
}
