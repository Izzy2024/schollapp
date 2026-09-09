import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import {
  getPublicApplicationInfo,
  submitApplication,
  getApplicants,
  recordExamResult,
  decideApplicant,
  convertApplicantToStudent,
} from '@/actions/admissions';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

async function makeTenantWithAdmin(slugPrefix: string) {
  const now = Date.now();
  const tenant = await prisma.tenant.create({
    data: { slug: `${slugPrefix}-${now}-${Math.random().toString(36).slice(2)}`, name: 'Tenant Admissions', timezone: 'America/Mexico_City' },
  });
  const admin = await prisma.user.create({
    data: { email: `admin-${now}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });
  await seedStudentsManage(tenant.id, admin.id);
  return { tenant, admin };
}

// DB-backed hasPermission() needs a real Permission + Role + UserRole row.
// Replicates the seed pattern from src/lib/__tests__/rbac.test.ts.
async function seedStudentsManage(tenantId: string, userId: string) {
  const permission = await prisma.permission.upsert({
    where: { code: 'students:manage' },
    update: {},
    create: { code: 'students:manage', description: 'test seed: students manage access' },
  });
  const role = await prisma.role.create({ data: { tenantId, name: `admissions-manager-${userId}` } });
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
  await prisma.userRole.create({ data: { tenantId, userId, roleId: role.id } });
}

describe('Admissions contract (public form + admin pipeline) — NO mock.module', () => {
  it('full pipeline: public submission -> exam -> accept -> convert to student', async () => {
    const { tenant, admin } = await makeTenantWithAdmin('t-adm-pipeline');

    const info = await getPublicApplicationInfo(tenant.slug);
    assert.ok(info);
    assert.equal(info!.tenantName, 'Tenant Admissions');

    const submitResult = await submitApplication(tenant.slug, {
      firstName: 'Sofía',
      lastName: 'Torres',
      guardianName: 'Mamá Torres',
      guardianEmail: 'mama@ex.com',
    });
    assert.deepEqual(submitResult, { success: true });

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });

    const applicants = await getApplicants();
    assert.equal(applicants.length, 1);
    assert.equal(applicants[0].status, 'submitted');
    const applicantId = applicants[0].id;

    await recordExamResult(applicantId, 92, true);
    const afterExam = await getApplicants('exam_passed');
    assert.equal(afterExam.length, 1);

    await decideApplicant(applicantId, 'accepted');
    const afterDecision = await getApplicants('accepted');
    assert.equal(afterDecision.length, 1);

    const conversion = await convertApplicantToStudent(applicantId);
    assert.ok('studentId' in conversion);
    if ('studentId' in conversion) {
      const student = await prisma.student.findUnique({ where: { id: conversion.studentId } });
      assert.equal(student?.firstName, 'Sofía');

      const guardianLink = await prisma.studentGuardian.findFirst({ where: { studentId: conversion.studentId } });
      assert.ok(guardianLink);
    }

    const finalApplicants = await getApplicants('enrolled');
    assert.equal(finalApplicants.length, 1);

    const reconvert = await convertApplicantToStudent(applicantId);
    assert.deepEqual(reconvert, { error: 'APPLICANT_ALREADY_CONVERTED' });

    clearTestSession();
  });

  it('non-admin/director cannot manage the applicant pipeline', async () => {
    const { tenant } = await makeTenantWithAdmin('t-adm-role');
    const now = Date.now();

    const teacher = await prisma.user.create({
      data: { email: `teacher-${now}@ex.com`, fullName: 'Teacher', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: teacher.id, status: 'active' } });

    setTestSession({ id: teacher.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    await assert.rejects(() => getApplicants(), /UNAUTHORIZED_ROLE/);
    clearTestSession();
  });

  it('submitApplication rejects an unknown tenant slug', async () => {
    const result = await submitApplication('does-not-exist-tenant', { firstName: 'A', lastName: 'B' });
    assert.deepEqual(result, { error: 'TENANT_NOT_FOUND' });
  });
});
