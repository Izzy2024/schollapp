import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { previewPromotion, runPromotion } from '@/actions/promotion';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

// DB-backed hasPermission() needs a real Permission + Role + UserRole row.
// Replicates the seed pattern from src/lib/__tests__/rbac.test.ts.
async function seedStudentsManage(tenantId: string, userId: string) {
  const permission = await prisma.permission.upsert({
    where: { code: 'students:manage' },
    update: {},
    create: { code: 'students:manage', description: 'test seed: students manage access' },
  });
  const role = await prisma.role.create({ data: { tenantId, name: `promotion-manager-${userId}` } });
  await prisma.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } });
  await prisma.userRole.create({ data: { tenantId, userId, roleId: role.id } });
}

describe('Academic year promotion contract — NO mock.module', () => {
  it('promotes enrolled students to the next grade in a new active year, and graduates the top grade', async () => {
    const now = Date.now();
    const tenant = await prisma.tenant.create({
      data: { slug: `t-promo-${now}`, name: 'Tenant Promotion', timezone: 'America/Mexico_City' },
    });

    const admin = await prisma.user.create({
      data: { email: `admin-${now}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });
    await seedStudentsManage(tenant.id, admin.id);

    const sourceYear = await prisma.academicYear.create({
      data: { tenantId: tenant.id, name: '2025-2026', startDate: new Date('2025-08-01'), endDate: new Date('2026-06-30'), isActive: true },
    });
    const targetYear = await prisma.academicYear.create({
      data: { tenantId: tenant.id, name: '2026-2027', startDate: new Date('2026-08-01'), endDate: new Date('2027-06-30'), isActive: false },
    });

    const grade1 = await prisma.gradeLevel.create({ data: { tenantId: tenant.id, code: `G1-${now}`, name: '1er Grado', sortOrder: 1 } });
    const grade2 = await prisma.gradeLevel.create({ data: { tenantId: tenant.id, code: `G2-${now}`, name: '2do Grado', sortOrder: 2 } });

    const sectionG1 = await prisma.section.create({
      data: { tenantId: tenant.id, academicYearId: sourceYear.id, gradeLevelId: grade1.id, name: 'A', capacity: 30 },
    });
    const sectionG2 = await prisma.section.create({
      data: { tenantId: tenant.id, academicYearId: sourceYear.id, gradeLevelId: grade2.id, name: 'A', capacity: 30 },
    });

    const studentInG1 = await prisma.student.create({ data: { tenantId: tenant.id, firstName: 'Ana', lastName: 'Pérez', status: 'active' } });
    const studentInG2 = await prisma.student.create({ data: { tenantId: tenant.id, firstName: 'Luis', lastName: 'Gómez', status: 'active' } });

    await prisma.enrollment.create({
      data: { tenantId: tenant.id, studentId: studentInG1.id, academicYearId: sourceYear.id, sectionId: sectionG1.id, status: 'enrolled' },
    });
    await prisma.enrollment.create({
      data: { tenantId: tenant.id, studentId: studentInG2.id, academicYearId: sourceYear.id, sectionId: sectionG2.id, status: 'enrolled' },
    });

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });

    const preview = await previewPromotion();
    assert.equal(preview.length, 2);
    const g1Row = preview.find((p) => p.gradeLevelName === '1er Grado');
    const g2Row = preview.find((p) => p.gradeLevelName === '2do Grado');
    assert.equal(g1Row?.targetGradeLevelName, '2do Grado');
    assert.equal(g2Row?.targetGradeLevelName, null);

    const result = await runPromotion(targetYear.id);
    assert.ok('promoted' in result);
    if ('promoted' in result) {
      assert.equal(result.promoted, 1);
      assert.equal(result.graduated, 1);
      assert.equal(result.sectionsCreated, 1);
    }

    // Student from grade 1 is now enrolled in grade 2, in the target year.
    const newEnrollment = await prisma.enrollment.findFirst({
      where: { tenantId: tenant.id, studentId: studentInG1.id, academicYearId: targetYear.id },
      include: { section: true },
    });
    assert.equal(newEnrollment?.status, 'reenrolled');
    assert.equal(newEnrollment?.section.gradeLevelId, grade2.id);
    assert.equal(newEnrollment?.section.name, 'A');

    // Student from grade 2 (top grade) graduated in the source year; no new enrollment created.
    const oldEnrollment = await prisma.enrollment.findFirst({
      where: { tenantId: tenant.id, studentId: studentInG2.id, academicYearId: sourceYear.id },
    });
    assert.equal(oldEnrollment?.status, 'graduated');
    const graduatedNewEnrollment = await prisma.enrollment.findFirst({
      where: { tenantId: tenant.id, studentId: studentInG2.id, academicYearId: targetYear.id },
    });
    assert.equal(graduatedNewEnrollment, null);

    // Target year is now the active one.
    const refreshedTargetYear = await prisma.academicYear.findUnique({ where: { id: targetYear.id } });
    const refreshedSourceYear = await prisma.academicYear.findUnique({ where: { id: sourceYear.id } });
    assert.equal(refreshedTargetYear?.isActive, true);
    assert.equal(refreshedSourceYear?.isActive, false);

    clearTestSession();
  });

  it('rejects a non-admin/director role', async () => {
    const now = Date.now();
    const tenant = await prisma.tenant.create({
      data: { slug: `t-promo-role-${now}`, name: 'Tenant Promotion Role', timezone: 'America/Mexico_City' },
    });
    const teacher = await prisma.user.create({
      data: { email: `teacher-${now}@ex.com`, fullName: 'Teacher', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: teacher.id, status: 'active' } });

    setTestSession({ id: teacher.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    await assert.rejects(() => previewPromotion(), /UNAUTHORIZED_ROLE/);
    clearTestSession();
  });
});
