'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { provisionUserAccount } from '@/lib/accountProvisioning';
import { STABLE_ERROR, stableError } from '@/lib/errors';

type Session = {
  id: string;
  email?: string | null;
  tenantSlug?: string | null;
  roles?: string[] | null;
};

function isAdminOrDirector(session: Session): boolean {
  const roles = session.roles ?? [];
  return roles.includes('admin') || roles.includes('director');
}

async function assertGuardiansAdmin(session: Session) {
  if (!isAdminOrDirector(session)) throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
}

export async function createGuardianAndLink(
  studentId: string,
  data: { fullName: string; relationship?: string; email?: string; phone?: string; isPrimary?: boolean },
  tenantSlug?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertGuardiansAdmin(session.user);
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const guardian = await prisma.$transaction(async (tx) => {
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

    return guardian;
  });

  let credentials: { email: string; tempPassword: string } | null = null;
  if (data.email) {
    const result = await provisionUserAccount({
      tenantId: tenant.id,
      email: data.email,
      fullName: data.fullName,
      role: 'parent',
    });
    if (result.tempPassword) credentials = { email: result.email, tempPassword: result.tempPassword };
  }

  revalidatePath(`/admin/students/${studentId}`);
  return { success: true, guardian, credentials };
}

export async function removeGuardianLink(studentId: string, guardianId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  await assertGuardiansAdmin(session.user);
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
