import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { getMyAssignments, submitAssignment, getSubmissionsForEvaluation, saveSubmissionFeedback } from '@/actions/submissions';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[]; email?: string }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

async function makeSetup() {
  const now = Date.now();
  const tenant = await prisma.tenant.create({
    data: { slug: `t-sub-${now}-${Math.random().toString(36).slice(2)}`, name: 'Tenant Submissions', timezone: 'America/Mexico_City' },
  });
  const academicYear = await prisma.academicYear.create({
    data: { tenantId: tenant.id, name: `AY-${now}`, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
  });
  const term = await prisma.term.create({
    data: { tenantId: tenant.id, academicYearId: academicYear.id, name: 'Periodo 1', startDate: new Date('2026-01-01'), endDate: new Date('2026-06-30') },
  });
  const gradeLevel = await prisma.gradeLevel.create({ data: { tenantId: tenant.id, code: `G-${now}`, name: '1er Grado' } });
  const section = await prisma.section.create({
    data: { tenantId: tenant.id, academicYearId: academicYear.id, gradeLevelId: gradeLevel.id, name: 'A' },
  });
  const subject = await prisma.subject.create({ data: { tenantId: tenant.id, name: `Ciencias-${now}` } });

  const teacherUser = await prisma.user.create({
    data: { email: `teacher-${now}@ex.com`, fullName: 'Docente', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: teacherUser.id, status: 'active' } });
  const staff = await prisma.staff.create({ data: { tenantId: tenant.id, fullName: 'Docente', userId: teacherUser.id, isActive: true } });

  const sectionSubject = await prisma.sectionSubject.create({
    data: { tenantId: tenant.id, sectionId: section.id, subjectId: subject.id, staffId: staff.id },
  });

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

  return { tenant, term, sectionSubject, staff, teacherUser, student, studentUser };
}

describe('Submissions contract (assignments with deadline) — NO mock.module', () => {
  beforeEach(() => {
    delete (globalThis as any).__TEST_PRISMA__;
  });

  it('student sees an assignment with a due date and can submit a file; teacher sees the submission and can leave feedback', async () => {
    const { tenant, term, sectionSubject, staff, teacherUser, student, studentUser } = await makeSetup();

    const futureDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const evaluation = await prisma.evaluation.create({
      data: {
        tenantId: tenant.id,
        sectionSubjectId: sectionSubject.id,
        termId: term.id,
        name: 'Ensayo 1',
        type: 'Tarea',
        date: new Date(),
        maxScore: 100,
        dueDate: futureDue,
      },
    });

    setTestSession({ id: studentUser.id, tenantSlug: tenant.slug, roles: ['student'], email: student.email! });
    const assignments = await getMyAssignments();
    assert.equal(assignments.length, 1);
    assert.equal(assignments[0].submission, null);

    const formData = new FormData();
    formData.set('file', new File(['contenido'], 'ensayo.txt', { type: 'text/plain' }));
    const result = await submitAssignment(evaluation.id, formData);
    assert.deepEqual(result, { success: true });

    const afterSubmit = await getMyAssignments();
    assert.equal(afterSubmit[0].submission?.status, 'submitted');
    assert.ok(afterSubmit[0].submission?.fileUrl);
    clearTestSession();

    setTestSession({ id: teacherUser.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    const rows = await getSubmissionsForEvaluation(evaluation.id);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].studentName, 'Ana Pérez');
    assert.equal(rows[0].status, 'submitted');
    assert.ok(rows[0].submissionId);

    await saveSubmissionFeedback(rows[0].submissionId!, 'Buen trabajo');
    const rowsAfterFeedback = await getSubmissionsForEvaluation(evaluation.id);
    assert.equal(rowsAfterFeedback[0].feedback, 'Buen trabajo');
    assert.equal(rowsAfterFeedback[0].status, 'graded');
    clearTestSession();

    void staff;
  });

  it('marks a submission as late when submitted after the due date', async () => {
    const { tenant, term, sectionSubject, student, studentUser } = await makeSetup();

    const pastDue = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const evaluation = await prisma.evaluation.create({
      data: {
        tenantId: tenant.id,
        sectionSubjectId: sectionSubject.id,
        termId: term.id,
        name: 'Ensayo tardío',
        type: 'Tarea',
        date: new Date(),
        maxScore: 100,
        dueDate: pastDue,
      },
    });

    setTestSession({ id: studentUser.id, tenantSlug: tenant.slug, roles: ['student'], email: student.email! });
    const formData = new FormData();
    formData.set('file', new File(['contenido'], 'tarde.txt', { type: 'text/plain' }));
    await submitAssignment(evaluation.id, formData);

    const assignments = await getMyAssignments();
    assert.equal(assignments[0].submission?.status, 'late');
    clearTestSession();
  });

  it('a teacher who does not own the class cannot view its submissions', async () => {
    const { tenant, term, sectionSubject } = await makeSetup();

    const evaluation = await prisma.evaluation.create({
      data: {
        tenantId: tenant.id,
        sectionSubjectId: sectionSubject.id,
        termId: term.id,
        name: 'Ensayo ajeno',
        type: 'Tarea',
        date: new Date(),
        maxScore: 100,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    const now = Date.now();
    const otherTeacherUser = await prisma.user.create({
      data: { email: `other-teacher-${now}@ex.com`, fullName: 'Otro Docente', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: otherTeacherUser.id, status: 'active' } });
    await prisma.staff.create({ data: { tenantId: tenant.id, fullName: 'Otro Docente', userId: otherTeacherUser.id, isActive: true } });

    setTestSession({ id: otherTeacherUser.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    await assert.rejects(
      () => getSubmissionsForEvaluation(evaluation.id),
      /SUBMISSION_FORBIDDEN/
    );
    clearTestSession();
  });
});
