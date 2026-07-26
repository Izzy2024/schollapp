import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import {
  createInvitation,
  revokeInvitation,
  getInvitationInfo,
  registerWithInvitation,
} from '@/actions/invitations';
import { changePassword } from '@/actions/authActions';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

async function makeTenant(slugPrefix: string) {
  const now = Date.now();
  return prisma.tenant.create({
    data: { slug: `${slugPrefix}-${now}-${Math.random().toString(36).slice(2)}`, name: 'Tenant Invitations', timezone: 'America/Mexico_City' },
    select: { id: true, slug: true },
  });
}

describe('Invitations contract (registration by code) — NO mock.module', () => {
  beforeEach(() => {
    delete (globalThis as any).__TEST_PRISMA__;
  });

  it('admin creates invitation for a student; regenerating replaces the pending one', async () => {
    const tenant = await makeTenant('t-inv-create');
    const now = Date.now();

    const admin = await prisma.user.create({
      data: { email: `admin-${now}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });

    const student = await prisma.student.create({
      data: { tenantId: tenant.id, firstName: 'Ana', lastName: 'Pérez', status: 'active' },
    });

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });

    const first = await createInvitation({ targetType: 'student', targetId: student.id });
    assert.ok('code' in first);
    if ('code' in first) {
      assert.equal(first.invitedName, 'Ana Pérez');

      const second = await createInvitation({ targetType: 'student', targetId: student.id });
      assert.ok('code' in second);

      const pendingCount = await prisma.invitation.count({
        where: { tenantId: tenant.id, targetType: 'student', targetId: student.id, usedAt: null },
      });
      assert.equal(pendingCount, 1);
    }

    clearTestSession();
  });

  it('non-admin/director cannot create invitations', async () => {
    const tenant = await makeTenant('t-inv-role');
    const now = Date.now();

    const teacher = await prisma.user.create({
      data: { email: `teacher-${now}@ex.com`, fullName: 'Teacher', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: teacher.id, status: 'active' } });

    const student = await prisma.student.create({
      data: { tenantId: tenant.id, firstName: 'Luis', lastName: 'Gómez', status: 'active' },
    });

    setTestSession({ id: teacher.id, tenantSlug: tenant.slug, roles: ['teacher'] });

    await assert.rejects(
      () => createInvitation({ targetType: 'student', targetId: student.id }),
      /UNAUTHORIZED_ROLE/
    );

    clearTestSession();
  });

  it('getInvitationInfo: not found and expired codes are rejected', async () => {
    const tenant = await makeTenant('t-inv-info');
    const now = Date.now();

    const notFound = await getInvitationInfo('does-not-exist');
    assert.deepEqual(notFound, { error: 'INVITE_NOT_FOUND' });

    const student = await prisma.student.create({
      data: { tenantId: tenant.id, firstName: 'Marta', lastName: 'Ruiz', status: 'active' },
    });

    const expired = await prisma.invitation.create({
      data: {
        tenantId: tenant.id,
        code: `expired-${now}`,
        targetType: 'student',
        targetId: student.id,
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    const result = await getInvitationInfo(expired.code);
    assert.deepEqual(result, { error: 'INVITE_EXPIRED' });
  });

  it('registerWithInvitation: happy path for student creates User, membership, role, and updates Student.email; code cannot be reused', async () => {
    const tenant = await makeTenant('t-inv-register');
    const now = Date.now();

    const admin = await prisma.user.create({
      data: { email: `admin-reg-${now}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });

    const student = await prisma.student.create({
      data: { tenantId: tenant.id, firstName: 'Carlos', lastName: 'Díaz', status: 'active' },
    });

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });
    const invite = await createInvitation({ targetType: 'student', targetId: student.id });
    clearTestSession();
    assert.ok('code' in invite);
    if (!('code' in invite)) return;

    const email = `carlos-${now}@ex.com`;
    const result = await registerWithInvitation({ code: invite.code, email, password: 'password123' });
    assert.deepEqual(result, { success: true });

    const user = await prisma.user.findUnique({ where: { email } });
    assert.ok(user);
    assert.equal(user!.mustChangePassword, false);

    const membership = await prisma.userMembership.findUnique({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user!.id } },
    });
    assert.ok(membership);

    const role = await prisma.userRole.findFirst({
      where: { tenantId: tenant.id, userId: user!.id },
      include: { role: true },
    });
    assert.equal(role?.role.name, 'student');

    const updatedStudent = await prisma.student.findUnique({ where: { id: student.id } });
    assert.equal(updatedStudent!.email, email);

    const reuse = await registerWithInvitation({ code: invite.code, email: `other-${now}@ex.com`, password: 'password123' });
    assert.deepEqual(reuse, { error: 'INVITE_USED' });
  });

  it('registerWithInvitation: staff path links Staff.userId', async () => {
    const tenant = await makeTenant('t-inv-staff');
    const now = Date.now();

    const admin = await prisma.user.create({
      data: { email: `admin-staff-${now}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });

    const staff = await prisma.staff.create({
      data: { tenantId: tenant.id, fullName: 'Profesora López', isActive: true },
    });

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });
    const invite = await createInvitation({ targetType: 'staff', targetId: staff.id });
    clearTestSession();
    assert.ok('code' in invite);
    if (!('code' in invite)) return;

    const email = `lopez-${now}@ex.com`;
    const result = await registerWithInvitation({ code: invite.code, email, password: 'password123' });
    assert.deepEqual(result, { success: true });

    const updatedStaff = await prisma.staff.findUnique({ where: { id: staff.id } });
    assert.ok(updatedStaff!.userId);

    const user = await prisma.user.findUnique({ where: { id: updatedStaff!.userId! } });
    assert.equal(user?.email, email);
  });

  it('registerWithInvitation: rejects when the email already has an account', async () => {
    const tenant = await makeTenant('t-inv-dup');
    const now = Date.now();

    const admin = await prisma.user.create({
      data: { email: `admin-dup-${now}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });

    const student = await prisma.student.create({
      data: { tenantId: tenant.id, firstName: 'Sofía', lastName: 'Torres', status: 'active' },
    });

    const existingEmail = `existing-${now}@ex.com`;
    await prisma.user.create({
      data: { email: existingEmail, fullName: 'Ya existe', passwordHash: 'x', isActive: true },
    });

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });
    const invite = await createInvitation({ targetType: 'student', targetId: student.id });
    clearTestSession();
    assert.ok('code' in invite);
    if (!('code' in invite)) return;

    const result = await registerWithInvitation({ code: invite.code, email: existingEmail, password: 'password123' });
    assert.deepEqual(result, { error: 'EMAIL_ALREADY_REGISTERED' });
  });

  it('revokeInvitation deletes only pending invitations', async () => {
    const tenant = await makeTenant('t-inv-revoke');
    const now = Date.now();

    const admin = await prisma.user.create({
      data: { email: `admin-revoke-${now}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });

    const student = await prisma.student.create({
      data: { tenantId: tenant.id, firstName: 'Iván', lastName: 'Solís', status: 'active' },
    });

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });
    const invite = await createInvitation({ targetType: 'student', targetId: student.id });
    assert.ok('code' in invite);
    if (!('code' in invite)) return;

    const created = await prisma.invitation.findUnique({ where: { code: invite.code } });
    await revokeInvitation(created!.id);

    const gone = await prisma.invitation.findUnique({ where: { code: invite.code } });
    assert.equal(gone, null);

    clearTestSession();
  });
});

describe('changePassword contract — NO mock.module', () => {
  beforeEach(() => {
    delete (globalThis as any).__TEST_PRISMA__;
  });

  it('rejects an incorrect current password and accepts a correct one', async () => {
    const now = Date.now();
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.hash('correct-password', 10);

    const user = await prisma.user.create({
      data: { email: `pwd-${now}@ex.com`, fullName: 'Usuario', passwordHash, isActive: true, mustChangePassword: true },
    });

    setTestSession({ id: user.id, tenantSlug: 'irrelevant', roles: [] });

    const wrong = await changePassword({ currentPassword: 'wrong', newPassword: 'new-password-123' });
    assert.deepEqual(wrong, { error: 'INVALID_CURRENT_PASSWORD' });

    const ok = await changePassword({ currentPassword: 'correct-password', newPassword: 'new-password-123' });
    assert.deepEqual(ok, { success: true });

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    assert.equal(updated!.mustChangePassword, false);
    assert.ok(await bcrypt.compare('new-password-123', updated!.passwordHash));

    clearTestSession();
  });
});
