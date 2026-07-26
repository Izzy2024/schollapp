'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import { ensureMembershipAndRole, type ProvisionRole } from '@/lib/accountProvisioning';

type InvitationTargetType = 'staff' | 'student' | 'guardian';

const TARGET_ROLE: Record<InvitationTargetType, ProvisionRole> = {
  staff: 'teacher',
  student: 'student',
  guardian: 'parent',
};

const INVITE_TTL_DAYS = 7;

// ponytail: revalidatePath needs a Next.js request context; contract tests run
// this action outside one, so failures here are swallowed (cache staleness, not correctness).
function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // no-op outside a Next.js request context (e.g. tests)
  }
}

async function getAdminTenantSession() {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  const roles = session.user.roles ?? [];
  if (!roles.includes('admin') && !roles.includes('director')) {
    throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);
  }

  const tenant = await prisma.tenant.findUnique({ where: { slug: session.user.tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  return { tenantId: tenant.id, actorUserId: session.user.id };
}

async function resolveTargetName(
  tenantId: string,
  targetType: InvitationTargetType,
  targetId: string
): Promise<{ name: string; email: string | null } | null> {
  if (targetType === 'staff') {
    const staff = await prisma.staff.findFirst({ where: { id: targetId, tenantId } });
    return staff ? { name: staff.fullName, email: staff.email } : null;
  }
  if (targetType === 'student') {
    const student = await prisma.student.findFirst({ where: { id: targetId, tenantId } });
    return student ? { name: `${student.firstName} ${student.lastName}`, email: student.email } : null;
  }
  const guardian = await prisma.guardian.findFirst({ where: { id: targetId, tenantId } });
  return guardian ? { name: guardian.fullName, email: guardian.email } : null;
}

export async function createInvitation(input: { targetType: InvitationTargetType; targetId: string }): Promise<
  { code: string; expiresAt: Date; invitedName: string } | { error: string }
> {
  const { tenantId, actorUserId } = await getAdminTenantSession();

  const target = await resolveTargetName(tenantId, input.targetType, input.targetId);
  if (!target) return { error: STABLE_ERROR.INVITE_TARGET_NOT_FOUND };

  await prisma.invitation.deleteMany({
    where: { tenantId, targetType: input.targetType, targetId: input.targetId, usedAt: null },
  });

  const code = crypto.randomBytes(6).toString('base64url');
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.invitation.create({
    data: {
      tenantId,
      code,
      targetType: input.targetType,
      targetId: input.targetId,
      expiresAt,
      createdById: actorUserId,
    },
  });

  safeRevalidate('/admin/staff');
  safeRevalidate('/admin/students');

  return { code, expiresAt, invitedName: target.name };
}

export async function revokeInvitation(id: string): Promise<{ success: true }> {
  const { tenantId } = await getAdminTenantSession();

  await prisma.invitation.deleteMany({ where: { id, tenantId, usedAt: null } });

  safeRevalidate('/admin/staff');
  safeRevalidate('/admin/students');

  return { success: true };
}

export async function listPendingInvitations(): Promise<
  Array<{ id: string; code: string; targetType: InvitationTargetType; invitedName: string; expiresAt: Date; expired: boolean }>
> {
  const { tenantId } = await getAdminTenantSession();

  const invitations = await prisma.invitation.findMany({
    where: { tenantId, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  const now = new Date();
  const resolved = await Promise.all(
    invitations.map(async (inv) => {
      const target = await resolveTargetName(tenantId, inv.targetType as InvitationTargetType, inv.targetId);
      return {
        id: inv.id,
        code: inv.code,
        targetType: inv.targetType as InvitationTargetType,
        invitedName: target?.name ?? '—',
        expiresAt: inv.expiresAt,
        expired: inv.expiresAt < now,
      };
    })
  );

  return resolved;
}

export async function getInvitationInfo(code: string): Promise<
  | { invitedName: string; tenantName: string; role: InvitationTargetType; suggestedEmail: string | null }
  | { error: string }
> {
  const invitation = await prisma.invitation.findUnique({ where: { code }, include: { tenant: true } });
  if (!invitation) return { error: STABLE_ERROR.INVITE_NOT_FOUND };
  if (invitation.usedAt) return { error: STABLE_ERROR.INVITE_USED };
  if (invitation.expiresAt < new Date()) return { error: STABLE_ERROR.INVITE_EXPIRED };

  const target = await resolveTargetName(
    invitation.tenantId,
    invitation.targetType as InvitationTargetType,
    invitation.targetId
  );
  if (!target) return { error: STABLE_ERROR.INVITE_TARGET_NOT_FOUND };

  return {
    invitedName: target.name,
    tenantName: invitation.tenant.name,
    role: invitation.targetType as InvitationTargetType,
    suggestedEmail: target.email,
  };
}

export async function registerWithInvitation(input: {
  code: string;
  email: string;
  password: string;
}): Promise<{ success: true } | { error: string }> {
  const email = input.email.trim().toLowerCase();
  if (input.password.length < 8) return { error: STABLE_ERROR.WEAK_PASSWORD };

  try {
    await prisma.$transaction(async (tx) => {
      const invitation = await tx.invitation.findUnique({ where: { code: input.code } });
      if (!invitation) throw stableError(STABLE_ERROR.INVITE_NOT_FOUND);
      if (invitation.usedAt) throw stableError(STABLE_ERROR.INVITE_USED);
      if (invitation.expiresAt < new Date()) throw stableError(STABLE_ERROR.INVITE_EXPIRED);

      const targetType = invitation.targetType as InvitationTargetType;
      const target = await resolveTargetName(invitation.tenantId, targetType, invitation.targetId);
      if (!target) throw stableError(STABLE_ERROR.INVITE_TARGET_NOT_FOUND);

      const existingUser = await tx.user.findUnique({ where: { email } });
      if (existingUser) throw stableError(STABLE_ERROR.EMAIL_ALREADY_REGISTERED);

      const passwordHash = await bcrypt.hash(input.password, 10);
      const user = await tx.user.create({
        data: { email, fullName: target.name, passwordHash, isActive: true, mustChangePassword: false },
      });

      await ensureMembershipAndRole(invitation.tenantId, user.id, TARGET_ROLE[targetType], tx);

      if (targetType === 'staff') {
        await tx.staff.update({ where: { id: invitation.targetId }, data: { userId: user.id } });
      } else if (targetType === 'student') {
        await tx.student.update({ where: { id: invitation.targetId }, data: { email } });
      } else {
        await tx.guardian.update({ where: { id: invitation.targetId }, data: { email } });
      }

      await tx.invitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date(), usedByUserId: user.id },
      });
    });

    return { success: true };
  } catch (err) {
    if (err instanceof Error && (Object.values(STABLE_ERROR) as string[]).includes(err.message)) {
      return { error: err.message };
    }
    throw err;
  }
}
