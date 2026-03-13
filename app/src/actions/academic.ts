'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ==========================================
// ACADEMIC YEAR
// ==========================================

export async function getAcademicYears() {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  return await prisma.academicYear.findMany({
    where: { tenantId: tenant.id },
    orderBy: { startDate: 'desc' },
  });
}

export async function createAcademicYear(name: string, startDateIso: string, endDateIso: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const existing = await prisma.academicYear.findFirst({
    where: { tenantId: tenant.id, name }
  });

  if (existing) {
    return { error: 'Ya existe un ciclo escolar con este nombre' };
  }

  const startDate = new Date(startDateIso);
  const endDate = new Date(endDateIso);

  if (startDate >= endDate) {
    return { error: 'La fecha de fin debe ser posterior a la fecha de inicio' };
  }

  // Check overlap (simplistic check)
  const overlap = await prisma.academicYear.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [
        { startDate: { lte: endDate }, endDate: { gte: startDate } }
      ]
    }
  });

  if (overlap) {
    return { error: 'Las fechas se traslapan con el ciclo: ' + overlap.name };
  }

  // If this is the first one, make it active
  const count = await prisma.academicYear.count({ where: { tenantId: tenant.id } });
  const isActive = count === 0;

  await prisma.academicYear.create({
    data: {
      tenantId: tenant.id,
      name,
      startDate,
      endDate,
      isActive,
    }
  });

  revalidatePath('/admin/academic');
  return { success: true };
}

export async function setAcademicYearActive(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  await prisma.$transaction(async (tx) => {
    // Desactivate all
    await tx.academicYear.updateMany({
      where: { tenantId: tenant.id },
      data: { isActive: false }
    });

    // Activate the requested one
    await tx.academicYear.update({
      where: { id, tenantId: tenant.id },
      data: { isActive: true }
    });
  });

  revalidatePath('/admin/academic');
  return { success: true };
}

// ==========================================
// SECTIONS (GRUPOS)
// ==========================================

export async function getSections() {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  return await prisma.section.findMany({
    where: { tenantId: tenant.id },
    include: {
      academicYear: true,
      gradeLevel: true,
      _count: { select: { enrollments: true } }
    },
    orderBy: [
      { academicYear: { startDate: 'desc' } },
      { gradeLevel: { sortOrder: 'asc' } },
      { name: 'asc' }
    ]
  });
}

export async function createSection(academicYearId: string, gradeLevelId: string, name: string, capacity: number) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const existing = await prisma.section.findFirst({
    where: { tenantId: tenant.id, academicYearId, gradeLevelId, name }
  });

  if (existing) {
    return { error: 'Ya existe una sección con este nombre para el ciclo y grado seleccionados' };
  }

  await prisma.section.create({
    data: {
      tenantId: tenant.id,
      academicYearId,
      gradeLevelId,
      name,
      capacity,
    }
  });

  revalidatePath('/admin/academic');
  return { success: true };
}

export async function deleteSection(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const enrollmentsCount = await prisma.enrollment.count({
    where: { sectionId: id }
  });

  if (enrollmentsCount > 0) {
    return { error: 'No se puede eliminar porque existen alumnos inscritos en este grupo' };
  }

  await prisma.section.delete({
    where: { id, tenantId: tenant.id }
  });

  revalidatePath('/admin/academic');
  return { success: true };
}

// ==========================================
// GRADE LEVEL
// ==========================================


export async function getGradeLevels() {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  return await prisma.gradeLevel.findMany({
    where: { tenantId: tenant.id },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function createGradeLevel(name: string, code: string, sortOrder: number) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const existingCode = await prisma.gradeLevel.findFirst({
    where: { tenantId: tenant.id, code }
  });

  if (existingCode) {
    return { error: 'Ya existe un grado con este código' };
  }

  await prisma.gradeLevel.create({
    data: {
      tenantId: tenant.id,
      name,
      code,
      sortOrder,
    }
  });

  revalidatePath('/admin/academic');
  return { success: true };
}

export async function deleteGradeLevel(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  const tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  // Check if sections are tied to this grade
  const sections = await prisma.section.count({
    where: { gradeLevelId: id, tenantId: tenant.id }
  });

  if (sections > 0) {
    return { error: 'No se puede eliminar porque existen secciones asignadas a este grado' };
  }

  await prisma.gradeLevel.delete({
    where: { id, tenantId: tenant.id }
  });

  revalidatePath('/admin/academic');
  return { success: true };
}
