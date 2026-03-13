'use server';

import { auth } from '@/auth';

import prisma from '@/lib/prisma';
import { ensureDefaultPrimaryCatalog } from '@/lib/defaultPrimaryCatalog';

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

export async function createSubject(name: string, code: string | null, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const existing = await prisma.subject.findFirst({
    where: { tenantId: tenant.id, name },
  });

  if (existing) {
    return { error: "Ya existe una materia con ese nombre" };
  }

  const subject = await prisma.subject.create({
    data: {
      tenantId: tenant.id,
      name,
      code,
    },
  });

  return { success: true, subject };
}

export async function updateSubject(subjectId: string, name: string, code: string | null, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const existing = await prisma.subject.findFirst({
    where: {
      tenantId: tenant.id,
      name,
      id: { not: subjectId },
    },
  });

  if (existing) {
    return { error: "Ya existe una materia con ese nombre" };
  }

  await prisma.subject.update({
    where: { id: subjectId },
    data: { name, code },
  });

  return { success: true };
}

export async function deleteSubject(subjectId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const count = await prisma.sectionSubject.count({
    where: { subjectId },
  });

  if (count > 0) {
    return { error: `Tiene ${count} clases asignadas` };
  }

  await prisma.subject.delete({
    where: { id: subjectId },
  });

  return { success: true };
}
