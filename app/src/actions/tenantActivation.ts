'use server';

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import type { Prisma } from '@prisma/client';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import { ensureMembershipAndRole } from '@/lib/accountProvisioning';
import { ensureDefaultPrimaryCatalog } from '@/lib/defaultPrimaryCatalog';

// ponytail: mirrors roleDefs in prisma/seed.ts (keep both in sync). A tenant created
// here never runs the seed, and hasPermission() denies everything to a role with no
// RolePermission rows — so the new tenant gets the same default roles up front.
const MANAGE_PERMISSIONS = ['finance:write', 'students:manage', 'staff:manage', 'invitations:manage', 'grades:write', 'attendance:write', 'health:manage', 'cafeteria:manage', 'inventory:manage', 'library:manage', 'transport:manage', 'conduct:manage', 'integrations:manage', 'schedule:manage'];
const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ['app:admin', ...MANAGE_PERMISSIONS],
  director: ['app:director', ...MANAGE_PERMISSIONS],
  teacher: ['app:teacher', 'grades:write', 'attendance:write'],
  parent: ['app:parent'],
  student: ['app:student'],
};

async function createDefaultRoles(tenantId: string, tx: Prisma.TransactionClient) {
  for (const [name, codes] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    await tx.role.create({
      data: {
        tenantId,
        name,
        permissions: {
          create: codes.map((code) => ({
            permission: { connectOrCreate: { where: { code }, create: { code, description: `Base permission for ${code}` } } },
          })),
        },
      },
    });
  }
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'escuela'
  );
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let n = 1;
  while (await prisma.tenant.findUnique({ where: { slug } })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export async function getActivationKeyInfo(
  key: string
): Promise<{ note: string | null } | { error: string }> {
  const activation = await prisma.tenantActivationKey.findUnique({ where: { key } });
  if (!activation) return { error: STABLE_ERROR.ACTIVATION_KEY_NOT_FOUND };
  if (activation.usedAt) return { error: STABLE_ERROR.ACTIVATION_KEY_USED };
  if (activation.expiresAt < new Date()) return { error: STABLE_ERROR.ACTIVATION_KEY_EXPIRED };

  return { note: activation.note };
}

export async function activateTenant(input: {
  key: string;
  schoolName: string;
  adminFullName: string;
  adminEmail: string;
  password: string;
}): Promise<{ success: true; tenantSlug: string } | { error: string }> {
  const schoolName = input.schoolName.trim();
  const adminEmail = input.adminEmail.trim().toLowerCase();

  if (!schoolName) return { error: STABLE_ERROR.SCHOOL_NAME_REQUIRED };
  if (input.password.length < 8) return { error: STABLE_ERROR.WEAK_PASSWORD };

  try {
    const tenantSlug = await prisma.$transaction(async (tx) => {
      const activation = await tx.tenantActivationKey.findUnique({ where: { key: input.key } });
      if (!activation) throw stableError(STABLE_ERROR.ACTIVATION_KEY_NOT_FOUND);
      if (activation.usedAt) throw stableError(STABLE_ERROR.ACTIVATION_KEY_USED);
      if (activation.expiresAt < new Date()) throw stableError(STABLE_ERROR.ACTIVATION_KEY_EXPIRED);

      const existingUser = await tx.user.findUnique({ where: { email: adminEmail } });
      if (existingUser) throw stableError(STABLE_ERROR.EMAIL_ALREADY_REGISTERED);

      const slug = await uniqueSlug(slugify(schoolName));
      const tenant = await tx.tenant.create({ data: { name: schoolName, slug } });
      await createDefaultRoles(tenant.id, tx);

      const passwordHash = await bcrypt.hash(input.password, 10);
      const user = await tx.user.create({
        data: {
          email: adminEmail,
          fullName: input.adminFullName.trim(),
          passwordHash,
          isActive: true,
          mustChangePassword: false,
        },
      });

      await ensureMembershipAndRole(tenant.id, user.id, 'admin', tx);

      await tx.tenantActivationKey.update({
        where: { id: activation.id },
        data: { usedAt: new Date(), usedByTenantId: tenant.id },
      });

      return tenant.slug;
    });

    // Outside the transaction: seeds catalog rows, not part of the atomic activation guarantee.
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
    if (tenant) await ensureDefaultPrimaryCatalog(tenant.id);

    return { success: true, tenantSlug };
  } catch (err) {
    if (err instanceof Error && (Object.values(STABLE_ERROR) as string[]).includes(err.message)) {
      return { error: err.message };
    }
    throw err;
  }
}
