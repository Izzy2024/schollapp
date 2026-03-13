'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function createGuardianAndLink(
  studentId: string,
  data: { fullName: string; relationship?: string; email?: string; phone?: string; isPrimary?: boolean },
  tenantSlug?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  return await prisma.$transaction(async (tx) => {
    // 1. Create Guardian
    const guardian = await tx.guardian.create({
      data: {
        tenantId: tenant.id,
        fullName: data.fullName,
        relationship: data.relationship,
        email: data.email,
        phone: data.phone,
      }
    });

    // 2. Link to student
    await tx.studentGuardian.create({
      data: {
        tenantId: tenant.id,
        studentId: studentId,
        guardianId: guardian.id,
        isPrimary: data.isPrimary ?? false,
      }
    });

    revalidatePath(`/admin/students/${studentId}`);
    return { success: true, guardian };
  });
}

export async function removeGuardianLink(studentId: string, guardianId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  await prisma.studentGuardian.delete({
    where: {
      tenantId_studentId_guardianId: {
        tenantId: tenant.id,
        studentId,
        guardianId
      }
    }
  });

  revalidatePath(`/admin/students/${studentId}`);
  return { success: true };
}
