import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { upsertHealthRecord, getHealthRecord, createHealthIncident, getHealthIncidents } from '@/actions/health';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[]; email?: string }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

async function makeSetup() {
  const now = Date.now();
  const tenant = await prisma.tenant.create({
    data: { slug: `t-health-${now}-${Math.random().toString(36).slice(2)}`, name: 'Tenant Health', timezone: 'America/Mexico_City' },
  });
  const admin = await prisma.user.create({
    data: { email: `admin-${now}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });

  const studentEmail = `student-${now}@ex.com`;
  const student = await prisma.student.create({
    data: { tenantId: tenant.id, firstName: 'Ana', lastName: 'Pérez', email: studentEmail, status: 'active' },
  });
  const studentUser = await prisma.user.create({
    data: { email: studentEmail, fullName: 'Ana Pérez', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: studentUser.id, status: 'active' } });

  const guardianEmail = `guardian-${now}@ex.com`;
  const guardian = await prisma.guardian.create({ data: { tenantId: tenant.id, fullName: 'Tutor', email: guardianEmail } });
  await prisma.studentGuardian.create({ data: { tenantId: tenant.id, studentId: student.id, guardianId: guardian.id } });
  const guardianUser = await prisma.user.create({
    data: { email: guardianEmail, fullName: 'Tutor', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: guardianUser.id, status: 'active' } });

  const teacherUser = await prisma.user.create({
    data: { email: `teacher-${now}@ex.com`, fullName: 'Teacher', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: teacherUser.id, status: 'active' } });

  return { tenant, admin, student, studentUser, guardianUser, teacherUser };
}

describe('Health record and incidents contract — NO mock.module', () => {
  it('admin creates a health record and an incident; student and guardian can read but not write', async () => {
    const { tenant, admin, student, studentUser, guardianUser, teacherUser } = await makeSetup();

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });
    await upsertHealthRecord(student.id, { bloodType: 'O+', allergies: 'Penicilina' });
    const created = await createHealthIncident(student.id, { type: 'injury', description: 'Se cayó en el recreo', treatmentGiven: 'Curita', sentHome: false });
    assert.deepEqual(created, { success: true });
    clearTestSession();

    setTestSession({ id: studentUser.id, tenantSlug: tenant.slug, roles: ['student'], email: studentUser.email });
    const recordAsStudent = await getHealthRecord(student.id);
    assert.equal(recordAsStudent?.bloodType, 'O+');
    const incidentsAsStudent = await getHealthIncidents(student.id);
    assert.equal(incidentsAsStudent.length, 1);
    await assert.rejects(
      () => createHealthIncident(student.id, { type: 'illness', description: 'x' }),
      /HEALTH_FORBIDDEN/
    );
    clearTestSession();

    setTestSession({ id: guardianUser.id, tenantSlug: tenant.slug, roles: ['parent'], email: guardianUser.email });
    const recordAsGuardian = await getHealthRecord(student.id);
    assert.equal(recordAsGuardian?.allergies, 'Penicilina');
    clearTestSession();

    setTestSession({ id: teacherUser.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    await assert.rejects(() => getHealthRecord(student.id), /HEALTH_FORBIDDEN/);
    await assert.rejects(
      () => createHealthIncident(student.id, { type: 'illness', description: 'x' }),
      /HEALTH_FORBIDDEN/
    );
    clearTestSession();
  });

  it('a student with no health record gets null rather than an error', async () => {
    const { tenant, admin, student } = await makeSetup();

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });
    const record = await getHealthRecord(student.id);
    assert.equal(record, null);
    clearTestSession();
  });
});
