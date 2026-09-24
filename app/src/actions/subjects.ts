'use server';

import { auth } from '@/auth';

import prisma from '@/lib/prisma';
import { ensureDefaultPrimaryCatalog } from '@/lib/defaultPrimaryCatalog';
import { requirePermission } from '@/lib/authz';
import { STABLE_ERROR, stableError } from '@/lib/errors';

export async function getSubjects(tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  await ensureDefaultPrimaryCatalog(tenant.id);

  const subjects = await prisma.subject.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { sectionSubjects: true } } },
    orderBy: { name: 'asc' },
  });

  return subjects.map(s => ({
    id: s.id,
    name: s.name,
    code: s.code,
    classCount: s._count.sectionSubjects,
  }));
}

export async function createSubject(name: string, code: string | null, _tenantSlug?: string) {
  const { tenantId } = await requirePermission('academic:manage');

  const existing = await prisma.subject.findFirst({
    where: { tenantId, name },
  });

  if (existing) {
    return { error: "Ya existe una materia con ese nombre" };
  }

  const subject = await prisma.subject.create({
    data: {
      tenantId,
      name,
      code,
    },
  });

  return { success: true, subject };
}

export async function updateSubject(subjectId: string, name: string, code: string | null, _tenantSlug?: string) {
  const { tenantId } = await requirePermission('academic:manage');
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, tenantId }, select: { id: true } });
  if (!subject) throw stableError(STABLE_ERROR.INVALID_TARGET);

  const existing = await prisma.subject.findFirst({
    where: {
      tenantId,
      name,
      id: { not: subjectId },
    },
  });

  if (existing) {
    return { error: "Ya existe una materia con ese nombre" };
  }

  const updated = await prisma.subject.updateMany({
    where: { id: subjectId, tenantId },
    data: { name, code },
  });
  if (updated.count !== 1) throw stableError(STABLE_ERROR.INVALID_TARGET);

  return { success: true };
}

export async function deleteSubject(subjectId: string, _tenantSlug?: string) {
  const { tenantId } = await requirePermission('academic:manage');
  const subject = await prisma.subject.findFirst({ where: { id: subjectId, tenantId }, select: { id: true } });
  if (!subject) throw stableError(STABLE_ERROR.INVALID_TARGET);

  const count = await prisma.sectionSubject.count({
    where: { subjectId, tenantId },
  });

  if (count > 0) {
    return { error: `Tiene ${count} clases asignadas` };
  }

  const deleted = await prisma.subject.deleteMany({ where: { id: subjectId, tenantId } });
  if (deleted.count !== 1) throw stableError(STABLE_ERROR.INVALID_TARGET);

  return { success: true };
}
