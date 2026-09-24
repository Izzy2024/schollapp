import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';
import { saveAttendanceBySectionDate, saveAttendanceSession } from '@/actions/attendance';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function makeTenant(prefix: string) {
  return prisma.tenant.create({
    data: { slug: uniq(prefix), name: 'Tenant Attendance Auth', timezone: 'America/Mexico_City' },
    select: { id: true, slug: true },
  });
}

async function makeUser(prefix: string, fullName: string) {
  return prisma.user.create({
    data: { email: `${uniq(prefix)}@ex.com`, fullName, passwordHash: 'x', isActive: true },
    select: { id: true },
  });
}

async function makeClassroom(tenantId: string) {
  const academicYear = await prisma.academicYear.create({
    data: { tenantId, name: uniq('AY'), startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
  });
  const gradeLevel = await prisma.gradeLevel.create({
    data: { tenantId, code: uniq('GL'), name: '1ro' },
  });
  const section = await prisma.section.create({
    data: { tenantId, academicYearId: academicYear.id, gradeLevelId: gradeLevel.id, name: 'A' },
  });
  const subject = await prisma.subject.create({ data: { tenantId, name: uniq('Subject') } });
  return { academicYear, section, subject };
}

describe('attendance authorization contract (real Postgres) — NO mock.module', () => {
  beforeEach(() => {
    delete (globalThis as any).__TEST_PRISMA__;
  });

  it('rechaza rol no permitido con error estable UNAUTHORIZED_SCOPE', async () => {
    const tenant = await makeTenant('att-auth-role');
    const studentUser = await makeUser('att-student', 'Alumno');
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: studentUser.id } });

    setTestSession({ id: studentUser.id, tenantSlug: tenant.slug, roles: ['student'] });

    await assert.rejects(
      () => saveAttendanceSession('any-section-subject', '2026-03-01', [{ studentId: 'any', status: 'present' }]),
      /UNAUTHORIZED_SCOPE/
    );

    clearTestSession();
  });

  it('rechaza docente no asignado al sectionSubjectId con UNAUTHORIZED_SCOPE', async () => {
    const tenant = await makeTenant('att-auth-owner');
    const { section, subject } = await makeClassroom(tenant.id);

    // Owner of the class is a different Staff member than the signed-in teacher.
    const ownerStaff = await prisma.staff.create({ data: { tenantId: tenant.id, fullName: 'Owner Docente' } });
    const teacherUser = await makeUser('att-teacher', 'Docente');
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: teacherUser.id } });
    await prisma.staff.create({ data: { tenantId: tenant.id, userId: teacherUser.id, fullName: 'Docente' } });

    const sectionSubject = await prisma.sectionSubject.create({
      data: { tenantId: tenant.id, sectionId: section.id, subjectId: subject.id, staffId: ownerStaff.id },
    });

    setTestSession({ id: teacherUser.id, tenantSlug: tenant.slug, roles: ['teacher'] });

    await assert.rejects(
      () => saveAttendanceSession(sectionSubject.id, '2026-03-01', [{ studentId: 'any', status: 'present' }]),
      /UNAUTHORIZED_SCOPE/
    );

    clearTestSession();
  });

  it('rechaza acceso cross-tenant con TENANT_SCOPE_VIOLATION', async () => {
    const tenantA = await makeTenant('att-auth-a');
    const tenantB = await makeTenant('att-auth-b');

    const { section, subject } = await makeClassroom(tenantB.id);
    const foreignSectionSubject = await prisma.sectionSubject.create({
      data: { tenantId: tenantB.id, sectionId: section.id, subjectId: subject.id },
    });

    const adminUser = await makeUser('att-admin', 'Admin');
    await prisma.userMembership.create({ data: { tenantId: tenantA.id, userId: adminUser.id } });

    setTestSession({ id: adminUser.id, tenantSlug: tenantA.slug, roles: ['admin'] });

    await assert.rejects(
      () => saveAttendanceSession(foreignSectionSubject.id, '2026-03-01', [{ studentId: 'any', status: 'present' }]),
      /TENANT_SCOPE_VIOLATION/
    );

    clearTestSession();
  });

  it('AUDIT SEG-M3: saveAttendanceBySectionDate rechaza a un docente que no es dueño de la sección', async () => {
    const tenant = await makeTenant('att-audit-m3-owner');
    const { section } = await makeClassroom(tenant.id);
    const teacherUser = await makeUser('att-m3-teacher', 'Docente');
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: teacherUser.id } });
    await prisma.staff.create({ data: { tenantId: tenant.id, userId: teacherUser.id, fullName: 'Docente' } });
    const student = await prisma.student.create({ data: { tenantId: tenant.id, firstName: 'A', lastName: 'B' } });

    setTestSession({ id: teacherUser.id, tenantSlug: tenant.slug, roles: ['teacher'] });

    await assert.rejects(
      () => saveAttendanceBySectionDate(section.id, '2026-03-01', [{ studentId: student.id, status: 'present' }]),
      /UNAUTHORIZED_SCOPE/
    );

    clearTestSession();
  });

  it('AUDIT SEG-M3: saveAttendanceBySectionDate rechaza studentId fuera de la inscripción', async () => {
    const tenant = await makeTenant('att-audit-m3-enroll');
    const { section } = await makeClassroom(tenant.id);
    const adminUser = await makeUser('att-m3-admin', 'Admin');
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: adminUser.id } });
    // Student exists in the tenant but is NOT enrolled in the section.
    const outsider = await prisma.student.create({ data: { tenantId: tenant.id, firstName: 'No', lastName: 'Inscrito' } });

    setTestSession({ id: adminUser.id, tenantSlug: tenant.slug, roles: ['admin'] });

    await assert.rejects(
      () => saveAttendanceBySectionDate(section.id, '2026-03-01', [{ studentId: outsider.id, status: 'present' }]),
      /INVALID_TARGET/
    );

    clearTestSession();
  });
});
