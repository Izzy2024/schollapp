import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';
import { seedPermission } from '@/test/factories/rbac';

import {
  getStudentAttendanceSummary,
  getAttendanceSession,
  getAttendanceBySectionDate,
  saveAttendanceBySectionDate,
} from '@/actions/attendance';
import { getClassDetail, getClassStudents, getClassAttendanceHistory } from '@/actions/classes';
import { saveGradeRecord } from '@/actions/gradebook';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[]; email?: string }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function makeUser(tenantId: string, prefix: string, email?: string) {
  const user = await prisma.user.create({
    data: { email: email ?? `${uniq(prefix)}@ex.com`, fullName: prefix, passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId, userId: user.id } });
  return user;
}

async function setup() {
  const tenant = await prisma.tenant.create({
    data: { slug: uniq('t-idor'), name: 'Tenant IDOR', timezone: 'America/Mexico_City' },
  });

  const academicYear = await prisma.academicYear.create({
    data: { tenantId: tenant.id, name: uniq('AY'), startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), isActive: true },
  });
  const term = await prisma.term.create({
    data: { tenantId: tenant.id, academicYearId: academicYear.id, name: uniq('Term'), startDate: new Date('2026-01-01'), endDate: new Date('2026-06-30') },
  });
  const gradeLevel = await prisma.gradeLevel.create({ data: { tenantId: tenant.id, code: uniq('GL'), name: '1ro' } });
  const section = await prisma.section.create({
    data: { tenantId: tenant.id, academicYearId: academicYear.id, gradeLevelId: gradeLevel.id, name: 'A' },
  });
  const subject = await prisma.subject.create({ data: { tenantId: tenant.id, name: uniq('Subject') } });

  // Teacher A owns the class; teacher B teaches nothing.
  const teacherAUser = await makeUser(tenant.id, 'teacher-a');
  const staffA = await prisma.staff.create({ data: { tenantId: tenant.id, userId: teacherAUser.id, fullName: 'Docente A' } });
  const teacherBUser = await makeUser(tenant.id, 'teacher-b');
  await prisma.staff.create({ data: { tenantId: tenant.id, userId: teacherBUser.id, fullName: 'Docente B' } });

  const sectionSubject = await prisma.sectionSubject.create({
    data: { tenantId: tenant.id, sectionId: section.id, subjectId: subject.id, staffId: staffA.id },
  });

  const evaluation = await prisma.evaluation.create({
    data: { tenantId: tenant.id, sectionSubjectId: sectionSubject.id, termId: term.id, name: uniq('Eval'), type: 'Exam', date: new Date('2026-03-01'), maxScore: 100 },
  });

  const enrolled = await prisma.student.create({ data: { tenantId: tenant.id, firstName: 'Ana', lastName: 'Inscrita' } });
  await prisma.enrollment.create({
    data: { tenantId: tenant.id, studentId: enrolled.id, academicYearId: academicYear.id, sectionId: section.id, status: 'enrolled' },
  });
  const notEnrolled = await prisma.student.create({ data: { tenantId: tenant.id, firstName: 'No', lastName: 'Inscrita' } });

  const admin = await makeUser(tenant.id, 'admin');
  await seedPermission(tenant.id, admin.id, 'attendance:write');
  await seedPermission(tenant.id, admin.id, 'grades:write');

  return { tenant, section, sectionSubject, evaluation, enrolled, notEnrolled, teacherAUser, teacherBUser, admin };
}

describe('Attendance/classes/gradebook IDOR contract — NO mock.module', () => {
  beforeEach(() => {
    delete (globalThis as any).__TEST_PRISMA__;
  });

  it('un docente que no da la clase es rechazado al leer/escribir asistencia y notas', async () => {
    const s = await setup();
    setTestSession({ id: s.teacherBUser.id, tenantSlug: s.tenant.slug, roles: ['teacher'] });

    await assert.rejects(() => getClassDetail(s.sectionSubject.id), /UNAUTHORIZED_ROLE/);
    await assert.rejects(() => getClassStudents(s.sectionSubject.id), /UNAUTHORIZED_ROLE/);
    await assert.rejects(() => getClassAttendanceHistory(s.sectionSubject.id), /UNAUTHORIZED_ROLE/);

    await assert.rejects(() => getAttendanceSession(s.sectionSubject.id, '2026-03-01'), /UNAUTHORIZED_ROLE/);
    await assert.rejects(() => getAttendanceBySectionDate(s.section.id, '2026-03-01'), /UNAUTHORIZED_ROLE/);
    await assert.rejects(
      () => saveAttendanceBySectionDate(s.section.id, '2026-03-01', [{ studentId: s.enrolled.id, status: 'present' }]),
      /UNAUTHORIZED_SCOPE/
    );
    await assert.rejects(() => saveGradeRecord(s.evaluation.id, s.enrolled.id, 10), /Unauthorized/);

    clearTestSession();
  });

  it('un alumno que no es el de la sesión ni su tutor es rechazado en getStudentAttendanceSummary', async () => {
    const s = await setup();
    const stranger = await makeUser(s.tenant.id, 'stranger');

    setTestSession({ id: stranger.id, tenantSlug: s.tenant.slug, roles: ['student'] });
    await assert.rejects(() => getStudentAttendanceSummary(s.enrolled.id), /UNAUTHORIZED_ROLE/);

    clearTestSession();
  });

  it('el propio alumno (email de sesión) y la gestión con attendance:write sí pueden leer', async () => {
    const s = await setup();

    const selfEmail = `${uniq('self')}@ex.com`;
    await prisma.student.update({ where: { id: s.enrolled.id }, data: { email: selfEmail } });
    const selfUser = await makeUser(s.tenant.id, 'self', selfEmail);

    setTestSession({ id: selfUser.id, tenantSlug: s.tenant.slug, roles: ['student'], email: selfEmail });
    const selfSummary = await getStudentAttendanceSummary(s.enrolled.id);
    assert.equal(selfSummary.totalDays, 0);

    setTestSession({ id: s.admin.id, tenantSlug: s.tenant.slug, roles: ['admin'] });
    const adminSummary = await getStudentAttendanceSummary(s.enrolled.id);
    assert.equal(adminSummary.totalDays, 0);

    const detail = await getClassDetail(s.sectionSubject.id);
    assert.equal(detail.id, s.sectionSubject.id);
    await getClassStudents(s.sectionSubject.id);
    await getClassAttendanceHistory(s.sectionSubject.id);
    await getAttendanceSession(s.sectionSubject.id, '2026-03-01');
    await getAttendanceBySectionDate(s.section.id, '2026-03-01');

    clearTestSession();
  });

  it('el docente dueño sí puede leer y guardar asistencia/nota de un alumno inscrito', async () => {
    const s = await setup();
    setTestSession({ id: s.teacherAUser.id, tenantSlug: s.tenant.slug, roles: ['teacher'] });

    const detail = await getClassDetail(s.sectionSubject.id);
    assert.equal(detail.id, s.sectionSubject.id);

    const saveAttendance = await saveAttendanceBySectionDate(s.section.id, '2026-03-02', [{ studentId: s.enrolled.id, status: 'present' }]);
    assert.equal((saveAttendance as { success: boolean }).success, true);

    const saveGrade = await saveGradeRecord(s.evaluation.id, s.enrolled.id, 85);
    assert.deepEqual(saveGrade, { success: true });

    const record = await prisma.gradeRecord.findFirst({ where: { tenantId: s.tenant.id, evaluationId: s.evaluation.id, studentId: s.enrolled.id } });
    assert.equal(record?.score, 85);

    clearTestSession();
  });

  it('un studentId no inscrito en la sección se rechaza al guardar asistencia y nota', async () => {
    const s = await setup();
    setTestSession({ id: s.admin.id, tenantSlug: s.tenant.slug, roles: ['admin'] });

    await assert.rejects(
      () => saveAttendanceBySectionDate(s.section.id, '2026-03-03', [{ studentId: s.notEnrolled.id, status: 'present' }]),
      /INVALID_TARGET/
    );

    setTestSession({ id: s.teacherAUser.id, tenantSlug: s.tenant.slug, roles: ['teacher'] });
    await assert.rejects(() => saveGradeRecord(s.evaluation.id, s.notEnrolled.id, 10), /INVALID_TARGET/);

    clearTestSession();
  });

  it('una nota fuera de [0, maxScore] se rechaza', async () => {
    const s = await setup();
    setTestSession({ id: s.teacherAUser.id, tenantSlug: s.tenant.slug, roles: ['teacher'] });

    await assert.rejects(() => saveGradeRecord(s.evaluation.id, s.enrolled.id, -1), /INVALID_TARGET/);
    await assert.rejects(() => saveGradeRecord(s.evaluation.id, s.enrolled.id, 101), /INVALID_TARGET/);

    clearTestSession();
  });
});
