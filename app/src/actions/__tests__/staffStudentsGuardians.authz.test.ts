import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { getStaffList, createStaff } from '@/actions/staff';
import { getStudents, createStudent, getStudentById, updateStudent } from '@/actions/students';
import { createGuardianAndLink, removeGuardianLink } from '@/actions/guardians';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

async function makeTenant(slugPrefix: string) {
  const now = Date.now();
  return prisma.tenant.create({
    data: {
      slug: `${slugPrefix}-${now}-${Math.random().toString(36).slice(2)}`,
      name: 'Tenant AuthZ',
      timezone: 'America/Mexico_City',
    },
    select: { id: true, slug: true },
  });
}

// DB-backed hasPermission() needs a real Permission + Role + UserRole row.
// Replicates the seed pattern from src/lib/__tests__/rbac.test.ts.
async function seedStudentsManage(tenantId: string, userId: string, roleName: string) {
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      email: `${userId}@test.local`,
      passwordHash: 'x',
      fullName: userId,
      isActive: true,
    },
  });
  const permission = await prisma.permission.upsert({
    where: { code: 'students:manage' },
    update: {},
    create: { code: 'students:manage', description: 'test seed: students manage access' },
  });
  const role = await prisma.role.create({ data: { tenantId, name: `${roleName}-${userId}` } });
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
  await prisma.userRole.create({ data: { tenantId, userId, roleId: role.id } });
}

describe('staff/students/guardians authorization — NO mock.module', () => {
  it('a non-admin session (student) is rejected with UNAUTHORIZED_ROLE on every management action', async () => {
    const tenant = await makeTenant('t-authz-student');
    try {
      setTestSession({ id: 'u-student', tenantSlug: tenant.slug, roles: ['student'] });

      // staff.ts
      await assert.rejects(() => getStaffList(), /UNAUTHORIZED_ROLE/);
      await assert.rejects(() => createStaff({ fullName: 'X' }), /UNAUTHORIZED_ROLE/);

      // students.ts
      await assert.rejects(() => getStudents(), /UNAUTHORIZED_ROLE/);
      await assert.rejects(() => createStudent({ firstName: 'X', lastName: 'Y' }), /UNAUTHORIZED_ROLE/);
      await assert.rejects(() => getStudentById('non-existent'), /UNAUTHORIZED_ROLE/);
      await assert.rejects(() => updateStudent('non-existent', { firstName: 'X' }), /UNAUTHORIZED_ROLE/);

      // guardians.ts — this is the escalation path: a student could otherwise
      // link themselves as a guardian of any student and provision a parent
      // account for an email they control.
      await assert.rejects(
        () => createGuardianAndLink('non-existent', { fullName: 'Attacker', email: 'attacker@ex.com' }),
        /UNAUTHORIZED_ROLE/
      );
      await assert.rejects(() => removeGuardianLink('non-existent', 'non-existent'), /UNAUTHORIZED_ROLE/);
    } finally {
      clearTestSession();
    }
  });

  it('admin and director sessions pass the authorization gate (fail later, on data, not on role)', async () => {
    const tenant = await makeTenant('t-authz-admin');
    try {
      for (const role of ['admin', 'director']) {
        await seedStudentsManage(tenant.id, `u-${role}`, role);
        setTestSession({ id: `u-${role}`, tenantSlug: tenant.slug, roles: [role] });

        // getStudentById with a non-existent id returns null rather than
        // throwing once past the role gate — proves the gate itself passed.
        assert.equal(await getStudentById('non-existent'), null);

        // removeGuardianLink with a non-existent link throws a Prisma "record
        // not found" error, not UNAUTHORIZED_ROLE — same proof for guardians.ts.
        await assert.rejects(() => removeGuardianLink('non-existent', 'non-existent'), (err: unknown) => {
          return !(err instanceof Error) || !/UNAUTHORIZED_ROLE/.test(err.message);
        });
      }
    } finally {
      clearTestSession();
    }
  });
});
