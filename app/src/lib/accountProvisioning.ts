import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import type { Prisma } from '@prisma/client';

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

type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

/**
 * Ensures the tenant membership + role assignment for a user, upserting the Role
 * itself if it doesn't exist yet for the tenant. Shared by admin-provisioned
 * accounts and self-service registration via invitation.
 */
export async function ensureMembershipAndRole(
  tenantId: string,
  userId: string,
  role: ProvisionRole,
  client: PrismaClientOrTx = prisma
): Promise<void> {
  await client.userMembership.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    update: {},
    create: { tenantId, userId, status: 'active' },
  });

  const roleRow = await client.role.upsert({
    where: { tenantId_name: { tenantId, name: role } },
    update: {},
    create: { tenantId, name: role },
  });

  await client.userRole.upsert({
    where: { tenantId_userId_roleId: { tenantId, userId, roleId: roleRow.id } },
    update: {},
    create: { tenantId, userId, roleId: roleRow.id },
  });
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
      data: { email, fullName: params.fullName, passwordHash, isActive: true, mustChangePassword: true },
    });
  }

  await ensureMembershipAndRole(params.tenantId, user.id, params.role);

  return { userId: user.id, email, tempPassword };
}
