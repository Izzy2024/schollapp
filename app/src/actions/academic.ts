'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requirePermission } from '@/lib/authz';
import { STABLE_ERROR, stableError } from '@/lib/errors';

// ==========================================
// ACADEMIC YEAR
// ==========================================

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    return;
  }
}

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
  const { tenantId } = await requirePermission('academic:manage');

  const existing = await prisma.academicYear.findFirst({
    where: { tenantId, name }
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
      tenantId,
      OR: [
        { startDate: { lte: endDate }, endDate: { gte: startDate } }
      ]
    }
  });

  if (overlap) {
    return { error: 'Las fechas se traslapan con el ciclo: ' + overlap.name };
  }

  // If this is the first one, make it active
  const count = await prisma.academicYear.count({ where: { tenantId } });
  const isActive = count === 0;

  await prisma.academicYear.create({
    data: {
      tenantId,
      name,
      startDate,
      endDate,
      isActive,
    }
  });

  safeRevalidate('/admin/academic');
  return { success: true };
}

export async function setAcademicYearActive(id: string) {
  const { tenantId } = await requirePermission('academic:manage');
  const academicYear = await prisma.academicYear.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!academicYear) throw stableError(STABLE_ERROR.INVALID_TARGET);

  await prisma.$transaction(async (tx) => {
    // Desactivate all
    await tx.academicYear.updateMany({
      where: { tenantId },
      data: { isActive: false }
    });

    // Activate the requested one
    await tx.academicYear.update({
      where: { id, tenantId },
      data: { isActive: true }
    });
  });

  safeRevalidate('/admin/academic');
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
  const { tenantId } = await requirePermission('academic:manage');
  const [academicYear, gradeLevel] = await Promise.all([
    prisma.academicYear.findFirst({ where: { id: academicYearId, tenantId }, select: { id: true } }),
    prisma.gradeLevel.findFirst({ where: { id: gradeLevelId, tenantId }, select: { id: true } }),
  ]);
  if (!academicYear || !gradeLevel) throw stableError(STABLE_ERROR.INVALID_TARGET);

  const existing = await prisma.section.findFirst({
    where: { tenantId, academicYearId, gradeLevelId, name }
  });

  if (existing) {
    return { error: 'Ya existe una sección con este nombre para el ciclo y grado seleccionados' };
  }

  await prisma.section.create({
    data: {
      tenantId,
      academicYearId,
      gradeLevelId,
      name,
      capacity,
    }
  });

  safeRevalidate('/admin/academic');
  return { success: true };
}

export async function deleteSection(id: string) {
  const { tenantId } = await requirePermission('academic:manage');
  const section = await prisma.section.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!section) throw stableError(STABLE_ERROR.INVALID_TARGET);

  const enrollmentsCount = await prisma.enrollment.count({
    where: { sectionId: id, tenantId }
  });

  if (enrollmentsCount > 0) {
    return { error: 'No se puede eliminar porque existen alumnos inscritos en este grupo' };
  }

  await prisma.section.delete({
    where: { id, tenantId }
  });

  safeRevalidate('/admin/academic');
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
  const { tenantId } = await requirePermission('academic:manage');

  const existingCode = await prisma.gradeLevel.findFirst({
    where: { tenantId, code }
  });

  if (existingCode) {
    return { error: 'Ya existe un grado con este código' };
  }

  await prisma.gradeLevel.create({
    data: {
      tenantId,
      name,
      code,
      sortOrder,
    }
  });

  safeRevalidate('/admin/academic');
  return { success: true };
}

export async function deleteGradeLevel(id: string) {
  const { tenantId } = await requirePermission('academic:manage');
  const gradeLevel = await prisma.gradeLevel.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!gradeLevel) throw stableError(STABLE_ERROR.INVALID_TARGET);

  // Check if sections are tied to this grade
  const sections = await prisma.section.count({
    where: { gradeLevelId: id, tenantId }
  });

  if (sections > 0) {
    return { error: 'No se puede eliminar porque existen secciones asignadas a este grado' };
  }

  await prisma.gradeLevel.delete({
    where: { id, tenantId }
  });

  safeRevalidate('/admin/academic');
  return { success: true };
}
