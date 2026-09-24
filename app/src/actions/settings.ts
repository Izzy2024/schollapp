'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { requireTenant, requirePermission } from '@/lib/authz';
import { STABLE_ERROR, stableError } from '@/lib/errors';

function safeRevalidate(path: string, type?: 'layout' | 'page') {
  try {
    if (type) revalidatePath(path, type);
    else revalidatePath(path);
  } catch {
    // no-op outside a Next.js request context (e.g. tests)
  }
}

// 1. Get Tenant Profile
export async function getTenantProfile() {
  const { tenantId } = await requireTenant();
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      name: true,
      logoUrl: true,
    },
  });

  if (!tenant) throw stableError(STABLE_ERROR.TENANT_NOT_FOUND);
  return {
    id: tenant.id,
    name: tenant.name,
    logoUrl: tenant.logoUrl || '',
  };
}

// 2. Update Tenant Profile
export async function updateTenantProfile(
  data: { name: string; domain?: string; logoUrl?: string }
) {
  const { tenantId } = await requirePermission('settings:manage');

  const name = data.name.trim();
  if (!name) throw new Error('El nombre del colegio es requerido');
  if (name.length > 160) throw new Error('El nombre del colegio es demasiado largo');

  const logoUrl = data.logoUrl?.trim() || null;
  if (logoUrl) {
    if (logoUrl.startsWith('data:')) {
      const match = logoUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) throw new Error('El logo debe ser PNG, JPG o WebP válido');
      if (logoUrl.length > 700_000) throw new Error('El logo optimizado no puede superar 512 KB');
    } else {
      try {
        const parsed = new URL(logoUrl);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      } catch {
        throw new Error('La URL del logotipo no es válida');
      }
    }
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name,
      logoUrl,
    },
  });

  safeRevalidate('/admin/settings');
  safeRevalidate('/', 'layout');

  return { success: true };
}

// 3. Import Students CSV (MVP)
export async function importStudentsCsv(csvContent: string) {
  const { tenantId, userId } = await requirePermission('settings:manage');

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw stableError(STABLE_ERROR.TENANT_NOT_FOUND);

  // Simple CSV parse
  const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) throw new Error('El archivo CSV está vacío o no tiene encabezados válidos');

  let successCount = 0;
  let errorCount = 0;
  const logs: string[] = [];

  // Batch parsing records
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(c => c.trim());
    if (row.length < 3) continue; // Skip broken rows

    // We expect: [0]=studentCode, [1]=firstName, [2]=lastName, [3]=nationalId(curp), [4]=email
    const studentCode = row[0];
    const firstName = row[1];
    const lastName = row[2];
    const nationalId = row[3] || null;
    const email = row[4] || null;

    if (!firstName || !lastName || !studentCode) {
      errorCount++;
      logs.push(`Fila ${i + 1}: Faltan campos obligatorios (nombres, apellidos, matrícula)`);
      continue;
    }

    try {
      // Upsert student
      await prisma.student.upsert({
        where: { tenantId_studentCode: { tenantId: tenant.id, studentCode } },
        update: {
          firstName,
          lastName,
          nationalId,
          email,
          status: 'active',
        },
        create: {
          tenantId: tenant.id,
          studentCode,
          firstName,
          lastName,
          nationalId,
          email,
          status: 'active',
        },
      });
      successCount++;
    } catch (e: any) {
      errorCount++;
      logs.push(`Fila ${i + 1}: Error al importar ${studentCode} - ${e.message}`);
    }
  }

  // Create an Activity Event
  await prisma.activityEvent.create({
    data: {
      tenantId: tenant.id,
      actorUserId: userId,
      entityType: 'IMPORT',
      entityId: 'csv-students',
      action: 'students_imported',
      metadata: JSON.stringify({ successCount, errorCount, totalLines: lines.length - 1 }),
    },
  });

  safeRevalidate('/admin/settings');
  safeRevalidate('/admin/students');

  return {
    success: true,
    message: `Proceso finalizado. Éxitos: ${successCount}, Errores: ${errorCount}`,
    logs,
  };
}

// 4. Get Tenant Settings (including Panama fiscal)
export async function getTenantSettings() {
  const { tenantId } = await requirePermission('settings:manage');

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      panamaRUC: true,
      panamaDV: true,
      panamaNIT: true,
      panamaPACApiKey: true,
    },
  });

  if (!tenant) throw stableError(STABLE_ERROR.TENANT_NOT_FOUND);

  return {
    panamaRUC: tenant.panamaRUC,
    panamaDV: tenant.panamaDV,
    panamaNIT: tenant.panamaNIT,
    panamaPACApiKey: tenant.panamaPACApiKey,
  };
}

// 5. Update Tenant Settings (Panama fiscal)
export async function updateTenantSettings(
  data: {
    panamaRUC?: string | null;
    panamaDV?: string | null;
    panamaNIT?: string | null;
    panamaPACApiKey?: string | null;
  }
) {
  const { tenantId } = await requirePermission('settings:manage');

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      panamaRUC: data.panamaRUC || null,
      panamaDV: data.panamaDV || null,
      panamaNIT: data.panamaNIT || null,
      panamaPACApiKey: data.panamaPACApiKey || null,
    },
  });

  safeRevalidate('/admin/settings');

  return { success: true };
}
