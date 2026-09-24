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

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
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
