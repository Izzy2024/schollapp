'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// 1. Get Tenant Profile
export async function getTenantProfile(tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  
  const resolvedSlug = tenantSlug || session.user.tenantSlug;
  const tenant = await prisma.tenant.findUnique({
    where: { slug: resolvedSlug }
  });

  if (!tenant) throw new Error('Tenant no encontrado');
  return {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    // NOTE: schema doesn't have a custom-domain field; this app isn't routed
    // by tenant domain, so it's kept as a display-only field for now.
    domain: '',
    logoUrl: tenant.logoUrl || ''
  };
}

// 2. Update Tenant Profile
export async function updateTenantProfile(
  tenantId: string,
  data: { name: string; domain?: string; logoUrl?: string }
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  
  // Verify ownership
  const tenant = await prisma.tenant.findFirst({
    where: { id: tenantId, slug: session.user.tenantSlug }
  });
  
  if (!tenant) throw new Error('Operación no permitida');

  await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      name: data.name,
      logoUrl: data.logoUrl?.trim() || null,
    }
  });

  revalidatePath('/admin/settings');
  revalidatePath('/', 'layout'); // Update main layout if logo changed
  
  return { success: true };
}

// 3. Import Students CSV (MVP)
export async function importStudentsCsv(tenantSlug: string, csvContent: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  
  const resolvedSlug = tenantSlug || session.user.tenantSlug;
  const tenant = await prisma.tenant.findUnique({ where: { slug: resolvedSlug } });
  if (!tenant) throw new Error('Tenant no encontrado');

  // Simple CSV parse
  const lines = csvContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) throw new Error('El archivo CSV está vacío o no tiene encabezados válidos');

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const expectedHeaders = ['matricula', 'nombres', 'apellidos', 'curp', 'correo', 'grado', 'grupo'];
  
  // Verify basic headers exist somehow (or loosely mapping)
  // Let's assume columns are fixed: matricula,nombres,apellidos,curp,correo
  
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
          status: 'active'
        },
        create: {
          tenantId: tenant.id,
          studentCode,
          firstName,
          lastName,
          nationalId,
          email,
          status: 'active'
        }
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
      actorUserId: session.user.id,
      entityType: 'IMPORT',
      entityId: 'csv-students',
      action: 'students_imported',
      metadata: JSON.stringify({ successCount, errorCount, totalLines: lines.length - 1 })
    }
  });

  revalidatePath('/admin/settings');
  revalidatePath('/admin/students');
  
  return {
    success: true,
    message: `Proceso finalizado. Éxitos: ${successCount}, Errores: ${errorCount}`,
    logs
  };
}

// 4. Get Tenant Settings (including Panama fiscal)
export async function getTenantSettings(tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  
  const resolvedSlug = tenantSlug || session.user.tenantSlug;
  const tenant = await prisma.tenant.findUnique({
    where: { slug: resolvedSlug },
    select: {
      panamaRUC: true,
      panamaDV: true,
      panamaNIT: true,
      panamaPACApiKey: true,
    }
  });

  if (!tenant) throw new Error('Tenant no encontrado');
  
  return {
    panamaRUC: tenant.panamaRUC,
    panamaDV: tenant.panamaDV,
    panamaNIT: tenant.panamaNIT,
    panamaPACApiKey: tenant.panamaPACApiKey,
  };
}

// 5. Update Tenant Settings (Panama fiscal)
export async function updateTenantSettings(
  tenantSlug: string,
  data: {
    panamaRUC?: string | null;
    panamaDV?: string | null;
    panamaNIT?: string | null;
    panamaPACApiKey?: string | null;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug }
  });
  
  if (!tenant) throw new Error('Tenant no encontrado');
  
  // Verify the user belongs to this tenant
  if (session.user.tenantSlug !== tenantSlug) {
    throw new Error('No autorizado para modificar este tenant');
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      panamaRUC: data.panamaRUC || null,
      panamaDV: data.panamaDV || null,
      panamaNIT: data.panamaNIT || null,
      panamaPACApiKey: data.panamaPACApiKey || null,
    }
  });

  revalidatePath('/admin/settings');
  
  return { success: true };
}
