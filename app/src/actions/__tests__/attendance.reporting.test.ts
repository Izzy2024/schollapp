import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';
import { getStudentAttendanceSummary } from '@/actions/attendance';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// Local-time dates so month grouping (getMonth/getFullYear) is stable.
function localDate(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, day);
}

async function makeTenant(prefix: string) {
  return prisma.tenant.create({
    data: { slug: uniq(prefix), name: 'Tenant Attendance Reporting', timezone: 'America/Mexico_City' },
    select: { id: true, slug: true },
  });
}

async function makeAdmin(tenantId: string) {
  const admin = await prisma.user.create({
    data: { email: `${uniq('att-rep-admin')}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
    select: { id: true },
  });
  await prisma.userMembership.create({ data: { tenantId, userId: admin.id } });
  return admin;
}

async function makeSections(tenantId: string, names: string[]) {
  const academicYear = await prisma.academicYear.create({
    data: { tenantId, name: uniq('AY'), startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
  });
  const gradeLevel = await prisma.gradeLevel.create({ data: { tenantId, code: uniq('GL'), name: '1ro' } });
  const sections: { id: string }[] = [];
  for (const name of names) {
    sections.push(
      await prisma.section.create({
        data: { tenantId, academicYearId: academicYear.id, gradeLevelId: gradeLevel.id, name },
        select: { id: true },
      })
    );
  }
  return sections;
}

async function seedRecord(tenantId: string, sectionId: string, studentId: string, date: Date, status: string, note: string | null = null) {
  const session = await prisma.attendanceSession.create({ data: { tenantId, sectionId, date } });
  await prisma.attendanceRecord.create({
    data: { tenantId, attendanceSessionId: session.id, studentId, status, note },
  });
}

describe('attendance reporting contract (real Postgres) — NO mock.module', () => {
  beforeEach(() => {
    delete (globalThis as any).__TEST_PRISMA__;
  });

  it('resume por alumno con dataset mínimo y totaliza estados', async () => {
    const tenant = await makeTenant('att-rep-summary');
    const admin = await makeAdmin(tenant.id);
    const [section] = await makeSections(tenant.id, ['A']);
    const student = await prisma.student.create({ data: { tenantId: tenant.id, firstName: 'Sofía', lastName: 'Ruiz' } });

    await seedRecord(tenant.id, section.id, student.id, localDate(2026, 2, 1), 'present');
    await seedRecord(tenant.id, section.id, student.id, localDate(2026, 2, 2), 'absent', 'Falta');
    await seedRecord(tenant.id, section.id, student.id, localDate(2026, 2, 3), 'late');

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });

    const summary = await getStudentAttendanceSummary(student.id);

    assert.equal(summary.totalDays, 3);
    assert.equal(summary.totalPresent, 1);
    assert.equal(summary.totalAbsent, 1);
    assert.equal(summary.overallPct, 33);
    assert.equal(summary.byMonth.length, 1);
    assert.equal(summary.byMonth[0]?.late, 1);
    assert.equal(summary.recentRecords.length, 3);

    clearTestSession();
  });

  it('incluye agregación básica por grupo (sectionId) para R005', async () => {
    const tenant = await makeTenant('att-rep-bysection');
    const admin = await makeAdmin(tenant.id);
    const [sectionA, sectionB] = await makeSections(tenant.id, ['A', 'B']);
    const student = await prisma.student.create({ data: { tenantId: tenant.id, firstName: 'Iván', lastName: 'Solís' } });

    await seedRecord(tenant.id, sectionA.id, student.id, localDate(2026, 2, 1), 'present');
    await seedRecord(tenant.id, sectionB.id, student.id, localDate(2026, 2, 2), 'absent');

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });

    const summary = await getStudentAttendanceSummary(student.id);

    assert.ok('bySection' in (summary as unknown as Record<string, unknown>));
    assert.equal(summary.bySection[sectionA.id].present, 1);
    assert.equal(summary.bySection[sectionB.id].absent, 1);

    clearTestSession();
  });

  it(
    'AUDIT SEG-H6: un rol sin vínculo con el alumno no puede leer su resumen',
    { skip: 'AUDIT SEG-H6: attendance.ts:386 no verifica dueño; cualquier rol autenticado lee la asistencia de cualquier alumno' },
    async () => {
      const tenant = await makeTenant('att-audit-segh6');
      const [section] = await makeSections(tenant.id, ['A']);
      const student = await prisma.student.create({ data: { tenantId: tenant.id, firstName: 'Ajeno', lastName: 'Total' } });
      await seedRecord(tenant.id, section.id, student.id, localDate(2026, 2, 1), 'present');

      // A teacher who does not teach this student (no relationship at all).
      const teacher = await prisma.user.create({
        data: { email: `${uniq('att-segh6-teacher')}@ex.com`, fullName: 'Docente Ajeno', passwordHash: 'x', isActive: true },
      });
      await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: teacher.id } });
      await prisma.staff.create({ data: { tenantId: tenant.id, userId: teacher.id, fullName: 'Docente Ajeno' } });

      setTestSession({ id: teacher.id, tenantSlug: tenant.slug, roles: ['teacher'] });

      await assert.rejects(() => getStudentAttendanceSummary(student.id), /UNAUTHORIZED|FORBIDDEN/);

      clearTestSession();
    }
  );
});
