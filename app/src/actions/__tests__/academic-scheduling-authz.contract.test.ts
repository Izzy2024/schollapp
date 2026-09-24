import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';
import { seedPermission } from '@/test/factories/rbac';
import {
  createAcademicYear,
  setAcademicYearActive,
  createSection,
  deleteSection,
  createGradeLevel,
  deleteGradeLevel,
} from '@/actions/academic';
import { createSubject, updateSubject, deleteSubject } from '@/actions/subjects';
import {
  createSectionSubject,
  assignTeacher,
  removeTeacher,
} from '@/actions/adminClasses';
import { createClassRequest, approveClassRequest, rejectClassRequest } from '@/actions/classRequests';
import {
  createScheduleRequest,
  approveScheduleRequest,
  rejectScheduleRequest,
} from '@/actions/scheduleRequests';
import {
  enrollStudent,
  unenrollStudent,
  reenrollStudent,
  getEnrollments,
  getStudentsWithoutEnrollment,
  getSectionsWithCapacity,
} from '@/actions/enrollment-impl';
import { generateEnrollmentCharges } from '@/actions/finance/enrollment-charges';

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

function isUnauthorized(error: any) {
  return error?.code === 'UNAUTHORIZED_ROLE' || /UNAUTHORIZED_ROLE/.test(error?.message ?? '');
}

async function createTenant(prefix: string) {
  const slug = `${prefix}-${uniqueSuffix()}`;
  return prisma.tenant.create({ data: { slug, name: slug, timezone: 'America/Mexico_City' } });
}

async function createUser(tenantId: string, prefix: string, permission?: string) {
  const user = await prisma.user.create({
    data: {
      email: `${prefix}-${uniqueSuffix()}@test.local`,
      fullName: prefix,
      passwordHash: 'test',
      isActive: true,
    },
  });
  await prisma.userMembership.create({ data: { tenantId, userId: user.id, status: 'active' } });
  if (permission) await seedPermission(tenantId, user.id, permission);
  return user;
}

async function createAcademicFixtures(tenantId: string) {
  const year = await prisma.academicYear.create({
    data: {
      tenantId,
      name: `Year-${uniqueSuffix()}`,
      startDate: new Date('2026-01-01T00:00:00Z'),
      endDate: new Date('2026-12-31T00:00:00Z'),
      isActive: true,
    },
  });
  const grade = await prisma.gradeLevel.create({
    data: { tenantId, name: `Grade-${uniqueSuffix()}`, code: `G-${uniqueSuffix()}` },
  });
  const section = await prisma.section.create({
    data: { tenantId, academicYearId: year.id, gradeLevelId: grade.id, name: `Section-${uniqueSuffix()}` },
  });
  const subject = await prisma.subject.create({
    data: { tenantId, name: `Subject-${uniqueSuffix()}`, code: `S-${uniqueSuffix()}` },
  });
  const staffUser = await createUser(tenantId, 'staff');
  const staff = await prisma.staff.create({
    data: { tenantId, userId: staffUser.id, fullName: staffUser.fullName, isActive: true },
  });
  const sectionSubject = await prisma.sectionSubject.create({
    data: { tenantId, sectionId: section.id, subjectId: subject.id, staffId: staff.id },
  });
  return { year, grade, section, subject, staff, sectionSubject };
}

describe('academic, subjects and admin classes authorization', () => {
  it('rejects every academic mutation without academic:manage', async () => {
    const tenant = await createTenant('t-academic-role');
    const user = await createUser(tenant.id, 'reader');
    setTestSession({ id: user.id, tenantSlug: tenant.slug, roles: ['teacher'] });

    try {
      const mutations = [
        () => createAcademicYear('2027', '2027-01-01', '2027-12-31'),
        () => setAcademicYearActive('academic-year-id'),
        () => createSection('academic-year-id', 'grade-level-id', 'A', 20),
        () => deleteSection('section-id'),
        () => createGradeLevel('Grade', 'G1', 1),
        () => deleteGradeLevel('grade-level-id'),
        () => createSubject('Subject', 'SUB'),
        () => updateSubject('subject-id', 'Renamed', 'SUB'),
        () => deleteSubject('subject-id'),
        () => createSectionSubject('section-id', 'subject-id', null),
        () => assignTeacher('section-subject-id', 'staff-id'),
        () => removeTeacher('section-subject-id'),
      ];

      for (const mutation of mutations) {
        await assert.rejects(mutation, /UNAUTHORIZED_ROLE/);
      }
    } finally {
      clearTestSession();
    }
  });

  it('does not allow a tenant A manager to mutate tenant B academic entities', async () => {
    const tenantA = await createTenant('t-academic-a');
    const tenantB = await createTenant('t-academic-b');
    const manager = await createUser(tenantA.id, 'manager', 'academic:manage');
    const fixturesA = await createAcademicFixtures(tenantA.id);
    const fixturesB = await createAcademicFixtures(tenantB.id);
    setTestSession({ id: manager.id, tenantSlug: tenantA.slug, roles: ['admin'] });

    try {
      await assert.rejects(
        () => createSection(fixturesB.year.id, fixturesB.grade.id, 'Foreign', 20),
        /INVALID_TARGET/
      );
      await assert.rejects(
        () => updateSubject(fixturesB.subject.id, 'Renamed foreign', 'FOREIGN'),
        /INVALID_TARGET/
      );
      await assert.rejects(
        () => assignTeacher(fixturesB.sectionSubject.id, fixturesB.staff.id),
        /INVALID_TARGET/
      );
      await assert.rejects(
        () => removeTeacher(fixturesB.sectionSubject.id),
        /INVALID_TARGET/
      );
      await assert.rejects(
        () => createSectionSubject(fixturesA.section.id, fixturesB.subject.id, fixturesA.staff.id),
        /INVALID_TARGET/
      );

      const subjectB = await prisma.subject.findUniqueOrThrow({ where: { id: fixturesB.subject.id } });
      assert.equal(subjectB.name, fixturesB.subject.name);
      const sectionSubjectB = await prisma.sectionSubject.findUniqueOrThrow({ where: { id: fixturesB.sectionSubject.id } });
      assert.equal(sectionSubjectB.staffId, fixturesB.staff.id);
    } finally {
      clearTestSession();
    }
  });
});

describe('class and schedule request authorization', () => {
  it('rejects class and schedule approvals without schedule:manage', async () => {
    const tenant = await createTenant('t-request-role');
    const fixtures = await createAcademicFixtures(tenant.id);
    const classRequest = await prisma.classRequest.create({
      data: {
        tenantId: tenant.id,
        staffId: fixtures.staff.id,
        subjectId: fixtures.subject.id,
        sectionId: fixtures.section.id,
        justification: 'Solicitud de prueba',
      },
    });
    const scheduleRequest = await prisma.scheduleRequest.create({
      data: {
        tenantId: tenant.id,
        sectionSubjectId: fixtures.sectionSubject.id,
        staffId: fixtures.staff.id,
        type: 'new',
        proposedDayOfWeek: 1,
        proposedStartTime: '08:00',
        proposedEndTime: '09:00',
        reason: 'Solicitud de prueba',
      },
    });
    const user = await createUser(tenant.id, 'request-reader');
    setTestSession({ id: user.id, tenantSlug: tenant.slug, roles: ['teacher'] });

    try {
      await assert.rejects(() => approveClassRequest(classRequest.id), /UNAUTHORIZED_ROLE/);
      await assert.rejects(() => rejectClassRequest(classRequest.id), /UNAUTHORIZED_ROLE/);
      await assert.rejects(() => approveScheduleRequest(scheduleRequest.id), /(UNAUTHORIZED_ROLE|No autorizado)/);
      await assert.rejects(() => rejectScheduleRequest(scheduleRequest.id, 'No autorizado'), /(UNAUTHORIZED_ROLE|No autorizado)/);
    } finally {
      clearTestSession();
    }
  });

  it('derives the class request staff from the session instead of a client staffId', async () => {
    const tenant = await createTenant('t-request-staff');
    const fixtures = await createAcademicFixtures(tenant.id);
    const otherUser = await createUser(tenant.id, 'other-teacher');
    const otherStaff = await prisma.staff.create({
      data: { tenantId: tenant.id, userId: otherUser.id, fullName: otherUser.fullName, isActive: true },
    });
    const requestedSubject = await prisma.subject.create({
      data: { tenantId: tenant.id, name: `Requested-${uniqueSuffix()}`, code: `R-${uniqueSuffix()}` },
    });
    setTestSession({ id: fixtures.staff.userId!, tenantSlug: tenant.slug, roles: ['teacher'] });

    try {
      const result = await createClassRequest(
        otherStaff.id,
        requestedSubject.id,
        fixtures.section.id,
        'Necesito esta clase'
      );
      assert.equal(result.success, true);
      const request = await prisma.classRequest.findFirstOrThrow({
        where: { tenantId: tenant.id, subjectId: requestedSubject.id, sectionId: fixtures.section.id },
      });
      assert.equal(request.staffId, fixtures.staff.id);
    } finally {
      clearTestSession();
    }
  });

  it('rejects a schedule request from a teacher who is not assigned to the class', async () => {
    const tenant = await createTenant('t-request-assignment');
    const fixtures = await createAcademicFixtures(tenant.id);
    const otherUser = await createUser(tenant.id, 'unassigned-teacher');
    const otherStaff = await prisma.staff.create({
      data: { tenantId: tenant.id, userId: otherUser.id, fullName: otherUser.fullName, isActive: true },
    });
    setTestSession({ id: otherUser.id, tenantSlug: tenant.slug, roles: ['teacher'] });

    try {
      const result = await createScheduleRequest(
        fixtures.sectionSubject.id,
        'new',
        1,
        '08:00',
        '09:00',
        null,
        'Solicitud de horario',
        null,
        null,
        null,
        null
      );
      assert.deepEqual(result, { success: false, error: 'No eres el docente asignado a esta clase.' });
    } finally {
      clearTestSession();
    }
  });

  it('records the current session user as the class request reviewer', async () => {
    const tenant = await createTenant('t-request-reviewer');
    const fixtures = await createAcademicFixtures(tenant.id);
    const decoy = await prisma.user.upsert({
      where: { email: 'admin@demo.com' },
      update: {},
      create: { email: 'admin@demo.com', fullName: 'Demo admin', passwordHash: 'test', isActive: true },
    });
    await prisma.userMembership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: decoy.id } },
      update: {},
      create: { tenantId: tenant.id, userId: decoy.id, status: 'active' },
    });
    const reviewer = await createUser(tenant.id, 'reviewer', 'schedule:manage');
    const request = await prisma.classRequest.create({
      data: {
        tenantId: tenant.id,
        staffId: fixtures.staff.id,
        subjectId: fixtures.subject.id,
        sectionId: fixtures.section.id,
        justification: 'Solicitud para aprobar',
      },
    });
    setTestSession({ id: reviewer.id, tenantSlug: tenant.slug, roles: ['admin'] });

    try {
      const result = await approveClassRequest(request.id);
      assert.equal(result.success, true);
      const updated = await prisma.classRequest.findUniqueOrThrow({ where: { id: request.id } });
      assert.equal(updated.reviewedById, reviewer.id);
      const event = await prisma.activityEvent.findFirstOrThrow({
        where: { tenantId: tenant.id, action: 'class_request_approved' },
      });
      assert.equal(event.actorUserId, reviewer.id);
    } finally {
      clearTestSession();
    }
  });
});

describe('enrollment authorization and tenant scope', () => {
  it('rejects parent and student sessions on every enrollment write and charge generation', async () => {
    const tenant = await createTenant('t-enrollment-role');
    const fixtures = await createAcademicFixtures(tenant.id);
    const student = await prisma.student.create({
      data: { tenantId: tenant.id, firstName: 'Student', lastName: `Role-${uniqueSuffix()}` },
    });
    const enrollment = await prisma.enrollment.create({
      data: {
        tenantId: tenant.id,
        studentId: student.id,
        sectionId: fixtures.section.id,
        academicYearId: fixtures.year.id,
        status: 'enrolled',
      },
    });
    const parent = await createUser(tenant.id, 'parent');
    const learner = await createUser(tenant.id, 'student');

    for (const [user, role] of [[parent, 'parent'], [learner, 'student']] as const) {
      setTestSession({ id: user.id, tenantSlug: tenant.slug, roles: [role] });
      try {
        await assert.rejects(() => enrollStudent(student.id, fixtures.section.id), isUnauthorized);
        await assert.rejects(() => unenrollStudent(enrollment.id), isUnauthorized);
        await assert.rejects(() => reenrollStudent(student.id, fixtures.section.id), isUnauthorized);
        await assert.rejects(
          () => generateEnrollmentCharges(student.id, enrollment.id, 'monthly', fixtures.year.id),
          isUnauthorized
        );
      } finally {
        clearTestSession();
      }
    }
  });

  it('keeps enrollment reads available to a tenant member without students:manage', async () => {
    const tenant = await createTenant('t-enrollment-read');
    await createAcademicFixtures(tenant.id);
    const reader = await createUser(tenant.id, 'reader');
    setTestSession({ id: reader.id, tenantSlug: tenant.slug, roles: ['teacher'] });

    try {
      assert.ok(Array.isArray(await getEnrollments()));
      assert.ok(Array.isArray(await getStudentsWithoutEnrollment()));
      assert.ok(Array.isArray(await getSectionsWithCapacity()));
    } finally {
      clearTestSession();
    }
  });

  it('rejects cross-tenant student enrollment and charge generation', async () => {
    const tenantA = await createTenant('t-enrollment-a');
    const tenantB = await createTenant('t-enrollment-b');
    const adminA = await createUser(tenantA.id, 'admin', 'students:manage');
    const fixturesA = await createAcademicFixtures(tenantA.id);
    const fixturesB = await createAcademicFixtures(tenantB.id);
    const studentB = await prisma.student.create({
      data: { tenantId: tenantB.id, firstName: 'Foreign', lastName: 'Student' },
    });
    const enrollmentB = await prisma.enrollment.create({
      data: {
        tenantId: tenantB.id,
        studentId: studentB.id,
        sectionId: fixturesB.section.id,
        academicYearId: fixturesB.year.id,
        status: 'enrolled',
      },
    });
    setTestSession({ id: adminA.id, tenantSlug: tenantA.slug, roles: ['admin'] });

    try {
      await assert.rejects(
        () => enrollStudent(studentB.id, fixturesA.section.id),
        (error: any) => error?.name === 'EnrollmentDomainError' && error?.code === 'TENANT_SCOPE_VIOLATION'
      );
      await assert.rejects(
        () => generateEnrollmentCharges(studentB.id, enrollmentB.id, 'monthly', fixturesA.year.id),
        /TARGET_SCOPE_VIOLATION/
      );
    } finally {
      clearTestSession();
    }
  });
});
