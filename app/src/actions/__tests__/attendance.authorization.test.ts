import { before, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

const authMock = mock.fn();
const revalidatePathMock = mock.fn();

const prismaMock = {
  tenant: { findUnique: mock.fn() },
  sectionSubject: { findUnique: mock.fn() },
  attendanceSession: { upsert: mock.fn() },
  attendanceRecord: { upsert: mock.fn() },
  activityEvent: { create: mock.fn() },
  $transaction: mock.fn(),
};

mock.module('@/auth', {
  namedExports: { auth: authMock },
});

mock.module('@/lib/prisma', {
  defaultExport: prismaMock,
});

mock.module('next/cache', {
  namedExports: { revalidatePath: revalidatePathMock },
});

let saveAttendanceSession: typeof import('../attendance').saveAttendanceSession;

function resetAllMocks() {
  authMock.mock.resetCalls();
  revalidatePathMock.mock.resetCalls();
  prismaMock.tenant.findUnique.mock.resetCalls();
  prismaMock.sectionSubject.findUnique.mock.resetCalls();
  prismaMock.attendanceSession.upsert.mock.resetCalls();
  prismaMock.attendanceRecord.upsert.mock.resetCalls();
  prismaMock.activityEvent.create.mock.resetCalls();
  prismaMock.$transaction.mock.resetCalls();
}

describe('attendance authorization contract (S03/T01 initial failing)', () => {
  before(async () => {
    const mod = await import('../attendance');
    saveAttendanceSession = mod.saveAttendanceSession;
  });

  it('rechaza rol no permitido con error estable UNAUTHORIZED_SCOPE', async () => {
    resetAllMocks();

    authMock.mock.mockImplementation(async () => ({
      user: { id: 'u-student', tenantSlug: 'school-a', role: 'student' },
    }));
    prismaMock.tenant.findUnique.mock.mockImplementation(async () => ({ id: 'tenant-a', slug: 'school-a' }));
    prismaMock.sectionSubject.findUnique.mock.mockImplementation(async () => ({
      id: 'ss-1',
      tenantId: 'tenant-a',
      sectionId: 'section-a',
      staffId: 'staff-1',
    }));

    await assert.rejects(
      () =>
        saveAttendanceSession('ss-1', '2026-03-01', [
          { studentId: 'student-1', status: 'present' },
        ]),
      (error: unknown) => {
        assert.equal((error as Error).message, 'UNAUTHORIZED_SCOPE');
        return true;
      }
    );
  });

  it('rechaza docente no asignado al sectionSubjectId con UNAUTHORIZED_SCOPE', async () => {
    resetAllMocks();

    authMock.mock.mockImplementation(async () => ({
      user: { id: 'u-teacher-2', tenantSlug: 'school-a', role: 'teacher', staffId: 'staff-2' },
    }));
    prismaMock.tenant.findUnique.mock.mockImplementation(async () => ({ id: 'tenant-a', slug: 'school-a' }));
    prismaMock.sectionSubject.findUnique.mock.mockImplementation(async () => ({
      id: 'ss-1',
      tenantId: 'tenant-a',
      sectionId: 'section-a',
      staffId: 'staff-1',
    }));

    await assert.rejects(
      () =>
        saveAttendanceSession('ss-1', '2026-03-01', [
          { studentId: 'student-1', status: 'present' },
        ]),
      /UNAUTHORIZED_SCOPE/
    );
  });

  it('rechaza acceso cross-tenant con TENANT_SCOPE_VIOLATION', async () => {
    resetAllMocks();

    authMock.mock.mockImplementation(async () => ({
      user: { id: 'u-admin-1', tenantSlug: 'school-a', role: 'admin' },
    }));
    prismaMock.tenant.findUnique.mock.mockImplementation(async () => ({ id: 'tenant-a', slug: 'school-a' }));
    prismaMock.sectionSubject.findUnique.mock.mockImplementation(async () => ({
      id: 'ss-1',
      tenantId: 'tenant-b',
      sectionId: 'section-b',
      staffId: 'staff-b',
    }));

    await assert.rejects(
      () =>
        saveAttendanceSession('ss-1', '2026-03-01', [
          { studentId: 'student-1', status: 'present' },
        ]),
      /TENANT_SCOPE_VIOLATION/
    );
  });
});
