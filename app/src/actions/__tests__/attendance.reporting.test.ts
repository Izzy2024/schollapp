import { before, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

const authMock = mock.fn();

const prismaMock = {
  tenant: { findUnique: mock.fn() },
  attendanceRecord: { findMany: mock.fn() },
};

mock.module('@/auth', {
  namedExports: { auth: authMock },
});

mock.module('@/lib/prisma', {
  defaultExport: prismaMock,
});

let getStudentAttendanceSummary: typeof import('../attendance').getStudentAttendanceSummary;

function resetAllMocks() {
  authMock.mock.resetCalls();
  prismaMock.tenant.findUnique.mock.resetCalls();
  prismaMock.attendanceRecord.findMany.mock.resetCalls();
}

describe('attendance reporting contract (S03/T01 initial failing)', () => {
  before(async () => {
    const mod = await import('../attendance');
    getStudentAttendanceSummary = mod.getStudentAttendanceSummary;
  });

  it('resume por alumno con dataset mínimo y totaliza estados', async () => {
    resetAllMocks();

    authMock.mock.mockImplementation(async () => ({
      user: { id: 'u-admin-1', tenantSlug: 'school-a', role: 'admin' },
    }));
    prismaMock.tenant.findUnique.mock.mockImplementation(async () => ({ id: 'tenant-a', slug: 'school-a' }));

    prismaMock.attendanceRecord.findMany.mock.mockImplementation(async () => [
      {
        status: 'present',
        note: null,
        attendanceSession: { date: new Date('2026-03-01T00:00:00.000Z'), sectionId: 'section-a' },
      },
      {
        status: 'absent',
        note: 'Falta',
        attendanceSession: { date: new Date('2026-03-02T00:00:00.000Z'), sectionId: 'section-a' },
      },
      {
        status: 'late',
        note: null,
        attendanceSession: { date: new Date('2026-03-03T00:00:00.000Z'), sectionId: 'section-a' },
      },
    ]);

    const summary = await getStudentAttendanceSummary('student-1');

    assert.equal(summary.totalDays, 3);
    assert.equal(summary.totalPresent, 1);
    assert.equal(summary.totalAbsent, 1);
    assert.equal(summary.overallPct, 33);
    assert.equal(summary.byMonth.length, 1);
    assert.equal(summary.byMonth[0]?.late, 1);
  });

  it('incluye agregación básica por grupo (sectionId) para R005', async () => {
    resetAllMocks();

    authMock.mock.mockImplementation(async () => ({
      user: { id: 'u-admin-1', tenantSlug: 'school-a', role: 'admin' },
    }));
    prismaMock.tenant.findUnique.mock.mockImplementation(async () => ({ id: 'tenant-a', slug: 'school-a' }));

    prismaMock.attendanceRecord.findMany.mock.mockImplementation(async () => [
      {
        status: 'present',
        note: null,
        attendanceSession: { date: new Date('2026-03-01T00:00:00.000Z'), sectionId: 'section-a' },
      },
      {
        status: 'absent',
        note: null,
        attendanceSession: { date: new Date('2026-03-02T00:00:00.000Z'), sectionId: 'section-b' },
      },
    ]);

    const summary = await getStudentAttendanceSummary('student-1');

    assert.ok('bySection' in (summary as any));
    assert.equal((summary as any).bySection['section-a'].present, 1);
    assert.equal((summary as any).bySection['section-b'].absent, 1);
  });
});
