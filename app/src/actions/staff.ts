'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';

export async function getStaffList(
  search?: string, 
  page = 1, 
  pageSize = 20,
  tenantSlug?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const where: Prisma.StaffWhereInput = { tenantId: tenant.id, isActive: true };

  if (search) {
    where.OR = [
      { fullName: { contains: search } },
      { email: { contains: search } }
    ];
  }

  const [total, staffRaw] = await prisma.$transaction([
    prisma.staff.count({ where }),
    prisma.staff.findMany({
      where,
      include: {
        sectionSubjects: {
          include: { subject: true, section: { include: { gradeLevel: true } } }
        }
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { fullName: 'asc' },
    })
  ]);

  const staff = staffRaw.map(s => ({
    id: s.id,
    fullName: s.fullName,
    email: s.email || '—',
    phone: s.phone || '—',
    roleLabel: s.roleLabel || 'Docente',
    isActive: s.isActive,
    classesCount: s.sectionSubjects.length,
    classesPreview: s.sectionSubjects.slice(0, 2).map(c => `${c.subject.name} (${c.section.gradeLevel.name} ${c.section.name})`).join(', ') + (s.sectionSubjects.length > 2 ? '...' : '')
  }));

  return { staff, total, page, pageSize };
}

export async function createStaff(
  data: { fullName: string; email?: string; phone?: string; roleLabel?: string },
  tenantSlug?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const staff = await prisma.staff.create({
    data: {
      tenantId: tenant.id,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      roleLabel: data.roleLabel || 'Docente',
      isActive: true,
    }
  });

  revalidatePath('/admin/staff');
  return { success: true, staff };
}
