import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { getStudentConductRecords, createConductRecord, deleteConductRecord } from '@/actions/conduct';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[]; email?: string }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

async function makeSetup() {
  const now = Date.now();
  const tenant = await prisma.tenant.create({
    data: { slug: `t-conduct-${now}-${Math.random().toString(36).slice(2)}`, name: 'Tenant Conduct', timezone: 'America/Mexico_City' },
  });
  const academicYear = await prisma.academicYear.create({
    data: { tenantId: tenant.id, name: `AY-${now}`, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
  });
  const gradeLevel = await prisma.gradeLevel.create({ data: { tenantId: tenant.id, code: `G-${now}`, name: '1er Grado' } });
  const section = await prisma.section.create({
    data: { tenantId: tenant.id, academicYearId: academicYear.id, gradeLevelId: gradeLevel.id, name: 'A' },
  });
  const subject = await prisma.subject.create({ data: { tenantId: tenant.id, name: `Materia-${now}` } });

  const teacherUser = await prisma.user.create({
    data: { email: `teacher-${now}@ex.com`, fullName: 'Docente', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: teacherUser.id, status: 'active' } });
  const staff = await prisma.staff.create({ data: { tenantId: tenant.id, fullName: 'Docente', userId: teacherUser.id, isActive: true } });
  await prisma.sectionSubject.create({ data: { tenantId: tenant.id, sectionId: section.id, subjectId: subject.id, staffId: staff.id } });

  const admin = await prisma.user.create({
    data: { email: `admin-${now}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });

  const student = await prisma.student.create({
    data: { tenantId: tenant.id, firstName: 'Ana', lastName: 'Pérez', email: `student-${now}@ex.com`, status: 'active' },
  });
  const studentUser = await prisma.user.create({
    data: { email: `student-${now}@ex.com`, fullName: 'Ana Pérez', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: studentUser.id, status: 'active' } });
  await prisma.enrollment.create({
    data: { tenantId: tenant.id, studentId: student.id, academicYearId: academicYear.id, sectionId: section.id, status: 'enrolled' },
  });

  const guardianEmail = `guardian-${now}@ex.com`;
  const guardian = await prisma.guardian.create({ data: { tenantId: tenant.id, fullName: 'Tutor', email: guardianEmail } });
  await prisma.studentGuardian.create({ data: { tenantId: tenant.id, studentId: student.id, guardianId: guardian.id } });
  const guardianUser = await prisma.user.create({
    data: { email: guardianEmail, fullName: 'Tutor', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: guardianUser.id, status: 'active' } });

  const otherTeacherUser = await prisma.user.create({
    data: { email: `other-teacher-${now}@ex.com`, fullName: 'Otro Docente', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: otherTeacherUser.id, status: 'active' } });
  await prisma.staff.create({ data: { tenantId: tenant.id, fullName: 'Otro Docente', userId: otherTeacherUser.id, isActive: true } });

  return { tenant, admin, teacherUser, studentUser, guardianUser, otherTeacherUser, student };
}

describe('Conduct records contract (merits/demerits, access control) — NO mock.module', () => {
  it('teacher of the class creates records; student, guardian, admin, and the same teacher can view; totals sum correctly', async () => {
    const { tenant, teacherUser, studentUser, guardianUser, student } = await makeSetup();

    setTestSession({ id: teacherUser.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    const demerit = await createConductRecord(student.id, { type: 'demerit', description: 'Llegó tarde', points: -2 });
    assert.deepEqual(demerit, { success: true });
    const merit = await createConductRecord(student.id, { type: 'merit', description: 'Ayudó a un compañero', points: 3 });
    assert.deepEqual(merit, { success: true });

    const asTeacher = await getStudentConductRecords(student.id);
    assert.equal(asTeacher.records.length, 2);
    assert.equal(asTeacher.totalPoints, 1);
    clearTestSession();

    setTestSession({ id: studentUser.id, tenantSlug: tenant.slug, roles: ['student'], email: studentUser.email });
    const asSelf = await getStudentConductRecords(student.id);
    assert.equal(asSelf.totalPoints, 1);
    clearTestSession();

    setTestSession({ id: guardianUser.id, tenantSlug: tenant.slug, roles: ['parent'], email: guardianUser.email });
    const asGuardian = await getStudentConductRecords(student.id);
    assert.equal(asGuardian.records.length, 2);
    clearTestSession();
  });

  it('a teacher who does not teach the student cannot create or view records; a teacher cannot delete', async () => {
    const { tenant, otherTeacherUser, teacherUser, student } = await makeSetup();

    setTestSession({ id: otherTeacherUser.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    await assert.rejects(
      () => createConductRecord(student.id, { type: 'demerit', description: 'x', points: -1 }),
      /CONDUCT_FORBIDDEN/
    );
    await assert.rejects(() => getStudentConductRecords(student.id), /CONDUCT_FORBIDDEN/);
    clearTestSession();

    setTestSession({ id: teacherUser.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    const created = await createConductRecord(student.id, { type: 'demerit', description: 'x', points: -1 });
    assert.deepEqual(created, { success: true });
    const { records } = await getStudentConductRecords(student.id);
    await assert.rejects(() => deleteConductRecord(records[0].id), /CONDUCT_FORBIDDEN/);
    clearTestSession();
  });

  it('admin can delete a record', async () => {
    const { tenant, admin, teacherUser, student } = await makeSetup();

    setTestSession({ id: teacherUser.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    await createConductRecord(student.id, { type: 'demerit', description: 'x', points: -1 });
    clearTestSession();

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });
    const { records } = await getStudentConductRecords(student.id);
    await deleteConductRecord(records[0].id);
    const after = await getStudentConductRecords(student.id);
    assert.equal(after.records.length, 0);
    clearTestSession();
  });
});
