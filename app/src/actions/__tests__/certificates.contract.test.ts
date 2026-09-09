import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { generateEnrollmentCertificatePdf } from '@/actions/certificates';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

describe('Enrollment certificate PDF contract — NO mock.module', () => {
  it('generates a PDF buffer for an admin requesting a valid enrollment', async () => {
    const now = Date.now();
    const tenant = await prisma.tenant.create({
      data: { slug: `t-cert-${now}`, name: 'Tenant Certificates', timezone: 'America/Mexico_City' },
    });
    const admin = await prisma.user.create({
      data: { email: `admin-${now}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });

    const academicYear = await prisma.academicYear.create({
      data: { tenantId: tenant.id, name: '2026-2027', startDate: new Date('2026-08-01'), endDate: new Date('2027-06-30') },
    });
    const gradeLevel = await prisma.gradeLevel.create({ data: { tenantId: tenant.id, code: `G-${now}`, name: '3er Grado' } });
    const section = await prisma.section.create({
      data: { tenantId: tenant.id, academicYearId: academicYear.id, gradeLevelId: gradeLevel.id, name: 'B' },
    });
    const student = await prisma.student.create({
      data: { tenantId: tenant.id, firstName: 'Carla', lastName: 'Núñez', status: 'active' },
    });
    await prisma.enrollment.create({
      data: { tenantId: tenant.id, studentId: student.id, academicYearId: academicYear.id, sectionId: section.id, status: 'enrolled' },
    });

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });

    const pdf = await generateEnrollmentCertificatePdf(student.id, academicYear.id);
    assert.ok(Buffer.isBuffer(pdf));
    assert.ok(pdf.length > 0);
    // PDFs start with the %PDF- magic header.
    assert.equal(pdf.subarray(0, 5).toString('ascii'), '%PDF-');

    clearTestSession();
  });

  it('rejects a non-admin/director role', async () => {
    const now = Date.now();
    const tenant = await prisma.tenant.create({
      data: { slug: `t-cert-role-${now}`, name: 'Tenant Certificates Role', timezone: 'America/Mexico_City' },
    });
    const teacher = await prisma.user.create({
      data: { email: `teacher-${now}@ex.com`, fullName: 'Teacher', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: teacher.id, status: 'active' } });

    setTestSession({ id: teacher.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    await assert.rejects(
      () => generateEnrollmentCertificatePdf('irrelevant', 'irrelevant'),
      /UNAUTHORIZED_ROLE/
    );
    clearTestSession();
  });

  it('rejects a student with no enrollment for the given academic year', async () => {
    const now = Date.now();
    const tenant = await prisma.tenant.create({
      data: { slug: `t-cert-noenroll-${now}`, name: 'Tenant No Enroll', timezone: 'America/Mexico_City' },
    });
    const admin = await prisma.user.create({
      data: { email: `admin2-${now}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });
    const academicYear = await prisma.academicYear.create({
      data: { tenantId: tenant.id, name: '2026-2027', startDate: new Date('2026-08-01'), endDate: new Date('2027-06-30') },
    });
    const student = await prisma.student.create({
      data: { tenantId: tenant.id, firstName: 'Sin', lastName: 'Inscripcion', status: 'active' },
    });

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });
    await assert.rejects(
      () => generateEnrollmentCertificatePdf(student.id, academicYear.id),
      /ENROLLMENT_NOT_FOUND/
    );
    clearTestSession();
  });
});
