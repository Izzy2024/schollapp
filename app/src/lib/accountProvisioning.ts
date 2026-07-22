import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export type ProvisionRole = 'teacher' | 'student' | 'parent';

export type ProvisionResult = {
  userId: string;
  email: string;
  /** Plaintext temp password — only set when a brand-new User was created. Show it to the admin once. */
  tempPassword: string | null;
};

function generateTempPassword(): string {
  return crypto.randomBytes(6).toString('base64url');
}

/**
 * Creates (or reuses, if the email already has a login) a User account, tenant
 * membership, and role assignment. Used whenever admin creates a Staff/Student/
 * Guardian record with an email, so that person can actually log in — creating
 * the domain record alone never provisions access.
 */
export async function provisionUserAccount(params: {
  tenantId: string;
  email: string;
  fullName: string;
  role: ProvisionRole;
}): Promise<ProvisionResult> {
  const email = params.email.trim().toLowerCase();

  let user = await prisma.user.findUnique({ where: { email } });
  let tempPassword: string | null = null;

  if (!user) {
    tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    user = await prisma.user.create({
      data: { email, fullName: params.fullName, passwordHash, isActive: true },
    });
  }

  await prisma.userMembership.upsert({
    where: { tenantId_userId: { tenantId: params.tenantId, userId: user.id } },
    update: {},
    create: { tenantId: params.tenantId, userId: user.id, status: 'active' },
  });

  const role = await prisma.role.upsert({
    where: { tenantId_name: { tenantId: params.tenantId, name: params.role } },
    update: {},
    create: { tenantId: params.tenantId, name: params.role },
  });

  await prisma.userRole.upsert({
    where: { tenantId_userId_roleId: { tenantId: params.tenantId, userId: user.id, roleId: role.id } },
    update: {},
    create: { tenantId: params.tenantId, userId: user.id, roleId: role.id },
  });

  return { userId: user.id, email, tempPassword };
}
