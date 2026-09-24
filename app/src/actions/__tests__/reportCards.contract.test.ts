import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { getStudentReportCard, getGradeWeights, setGradeWeights } from '@/actions/reportCards';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[]; email?: string }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

async function makeTenant(slugPrefix: string) {
  const now = Date.now();
  return prisma.tenant.create({
    data: { slug: `${slugPrefix}-${now}-${Math.random().toString(36).slice(2)}`, name: 'Tenant Report Cards', timezone: 'America/Mexico_City' },
    select: { id: true, slug: true },
  });
}

async function makeAcademicSetup(tenantId: string) {
  const academicYear = await prisma.academicYear.create({
    data: { tenantId, name: `AY-${Date.now()}`, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
  });
  const term = await prisma.term.create({
    data: { tenantId, academicYearId: academicYear.id, name: 'Periodo 1', startDate: new Date('2026-01-01'), endDate: new Date('2026-06-30') },
  });
  const gradeLevel = await prisma.gradeLevel.create({ data: { tenantId, code: `G-${Date.now()}`, name: '1er Grado' } });
  const section = await prisma.section.create({
    data: { tenantId, academicYearId: academicYear.id, gradeLevelId: gradeLevel.id, name: 'A' },
  });
  const subject = await prisma.subject.create({ data: { tenantId, name: `Matemáticas-${Date.now()}` } });
  const sectionSubject = await prisma.sectionSubject.create({
    data: { tenantId, sectionId: section.id, subjectId: subject.id },
  });

  return { term, section, sectionSubject };
}

describe('Report cards contract (weighting + access) — NO mock.module', () => {
  beforeEach(() => {
    delete (globalThis as any).__TEST_PRISMA__;
  });

  it('computes a simple average when no weight config exists', async () => {
    const tenant = await makeTenant('t-rc-simple');
    const { term, section, sectionSubject } = await makeAcademicSetup(tenant.id);

    const admin = await prisma.user.create({
      data: { email: `admin-${Date.now()}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });

    const student = await prisma.student.create({
      data: { tenantId: tenant.id, firstName: 'Ana', lastName: 'Pérez', status: 'active' },
    });
    const academicYear = await prisma.academicYear.findFirstOrThrow({ where: { tenantId: tenant.id } });
    await prisma.enrollment.create({
      data: { tenantId: tenant.id, studentId: student.id, academicYearId: academicYear.id, sectionId: section.id, status: 'enrolled' },
    });

    const exam = await prisma.evaluation.create({
      data: { tenantId: tenant.id, sectionSubjectId: sectionSubject.id, termId: term.id, name: 'Examen 1', type: 'Examen', date: new Date(), maxScore: 100 },
    });
    const homework = await prisma.evaluation.create({
      data: { tenantId: tenant.id, sectionSubjectId: sectionSubject.id, termId: term.id, name: 'Tarea 1', type: 'Tarea', date: new Date(), maxScore: 100 },
    });
    await prisma.gradeRecord.create({ data: { tenantId: tenant.id, evaluationId: exam.id, studentId: student.id, score: 80 } });
    await prisma.gradeRecord.create({ data: { tenantId: tenant.id, evaluationId: homework.id, studentId: student.id, score: 100 } });

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });
    const card = await getStudentReportCard(student.id, term.id);
    clearTestSession();

    assert.equal(card.subjects.length, 1);
    // No weight config -> simple average of type averages: (80 + 100) / 2 = 90
    assert.equal(card.subjects[0].finalAveragePercent, 90);
    assert.equal(card.overallAveragePercent, 90);
  });

  it('applies configured weights when present, ignoring types without evaluations', async () => {
    const tenant = await makeTenant('t-rc-weighted');
    const { term, section, sectionSubject } = await makeAcademicSetup(tenant.id);

    const admin = await prisma.user.create({
      data: { email: `admin-${Date.now()}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });
    await setGradeWeights([
      { type: 'Examen', weightPercent: 70 },
      { type: 'Tarea', weightPercent: 20 },
      { type: 'Participación', weightPercent: 10 },
    ]);
    const weights = await getGradeWeights();
    assert.equal(weights.length, 3);

    const student = await prisma.student.create({
      data: { tenantId: tenant.id, firstName: 'Luis', lastName: 'Gómez', status: 'active' },
    });
    const academicYear = await prisma.academicYear.findFirstOrThrow({ where: { tenantId: tenant.id } });
    await prisma.enrollment.create({
      data: { tenantId: tenant.id, studentId: student.id, academicYearId: academicYear.id, sectionId: section.id, status: 'enrolled' },
    });

    const exam = await prisma.evaluation.create({
      data: { tenantId: tenant.id, sectionSubjectId: sectionSubject.id, termId: term.id, name: 'Examen 1', type: 'Examen', date: new Date(), maxScore: 100 },
    });
    const homework = await prisma.evaluation.create({
      data: { tenantId: tenant.id, sectionSubjectId: sectionSubject.id, termId: term.id, name: 'Tarea 1', type: 'Tarea', date: new Date(), maxScore: 100 },
    });
    await prisma.gradeRecord.create({ data: { tenantId: tenant.id, evaluationId: exam.id, studentId: student.id, score: 90 } });
    await prisma.gradeRecord.create({ data: { tenantId: tenant.id, evaluationId: homework.id, studentId: student.id, score: 60 } });

    const card = await getStudentReportCard(student.id, term.id);
    clearTestSession();

    // Only Examen (70) and Tarea (20) present -> weighted avg = (90*70 + 60*20) / 90 = 83.33...
    assert.equal(card.subjects[0].finalAveragePercent, 83.3);
  });

  it('rejects setGradeWeights when percentages do not sum to 100', async () => {
    const tenant = await makeTenant('t-rc-badweight');
    const admin = await prisma.user.create({
      data: { email: `admin-${Date.now()}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });
    await assert.rejects(
      () => setGradeWeights([{ type: 'Examen', weightPercent: 50 }]),
      /deben sumar 100/
    );
    clearTestSession();
  });

  it('access control: guardian of the student can view, unrelated guardian cannot', async () => {
    const tenant = await makeTenant('t-rc-access');
    const { term, section } = await makeAcademicSetup(tenant.id);
    const now = Date.now();

    const student = await prisma.student.create({
      data: { tenantId: tenant.id, firstName: 'Marta', lastName: 'Ruiz', status: 'active' },
    });
    const academicYear = await prisma.academicYear.findFirstOrThrow({ where: { tenantId: tenant.id } });
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

    setTestSession({ id: guardianUser.id, tenantSlug: tenant.slug, roles: ['parent'], email: guardianEmail });
    const card = await getStudentReportCard(student.id, term.id);
    assert.equal(card.studentName, 'Marta Ruiz');
    clearTestSession();

    const otherGuardianEmail = `other-guardian-${now}@ex.com`;
    const otherUser = await prisma.user.create({
      data: { email: otherGuardianEmail, fullName: 'Otro Tutor', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: otherUser.id, status: 'active' } });

    setTestSession({ id: otherUser.id, tenantSlug: tenant.slug, roles: ['parent'], email: otherGuardianEmail });
    await assert.rejects(
      () => getStudentReportCard(student.id, term.id),
      /UNAUTHORIZED_ROLE/
    );
    clearTestSession();
  });
});
