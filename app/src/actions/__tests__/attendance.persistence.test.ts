import { before, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

const authMock = mock.fn();
const revalidatePathMock = mock.fn();

const txMock = {
  attendanceSession: { upsert: mock.fn() },
  attendanceRecord: { upsert: mock.fn() },
  activityEvent: { create: mock.fn() },
};

const prismaMock = {
  tenant: { findUnique: mock.fn() },
  sectionSubject: { findUnique: mock.fn() },
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
  prismaMock.$transaction.mock.resetCalls();
  txMock.attendanceSession.upsert.mock.resetCalls();
  txMock.attendanceRecord.upsert.mock.resetCalls();
  txMock.activityEvent.create.mock.resetCalls();
}

describe('attendance persistence contract (S03/T01 initial failing)', () => {
  before(async () => {
    const mod = await import('../attendance');
    saveAttendanceSession = mod.saveAttendanceSession;
  });

  it('rechaza estado inválido con INVALID_ATTENDANCE_STATUS', async () => {
    resetAllMocks();

    authMock.mock.mockImplementation(async () => ({
      user: { id: 'u-admin-1', tenantSlug: 'school-a', role: 'admin' },
    }));
    prismaMock.tenant.findUnique.mock.mockImplementation(async () => ({ id: 'tenant-a', slug: 'school-a' }));
    prismaMock.sectionSubject.findUnique.mock.mockImplementation(async () => ({
      id: 'ss-1',
      tenantId: 'tenant-a',
      sectionId: 'section-a',
    }));

    await assert.rejects(
      () =>
        saveAttendanceSession('ss-1', '2026-03-01', [
          { studentId: 'student-1', status: 'remote' },
        ]),
      /INVALID_ATTENDANCE_STATUS/
    );
  });

  it('re-guardado es idempotente y conserva misma session por tenant/section/date', async () => {
    resetAllMocks();

    authMock.mock.mockImplementation(async () => ({
      user: { id: 'u-admin-1', tenantSlug: 'school-a', role: 'admin' },
    }));
    prismaMock.tenant.findUnique.mock.mockImplementation(async () => ({ id: 'tenant-a', slug: 'school-a' }));
    prismaMock.sectionSubject.findUnique.mock.mockImplementation(async () => ({
      id: 'ss-1',
      tenantId: 'tenant-a',
      sectionId: 'section-a',
    }));

    txMock.attendanceSession.upsert.mock.mockImplementation(async () => ({ id: 'as-1' }));
    txMock.attendanceRecord.upsert.mock.mockImplementation(async () => ({ id: 'ar-1' }));
    txMock.activityEvent.create.mock.mockImplementation(async () => ({ id: 'ev-1' }));

    prismaMock.$transaction.mock.mockImplementation(async (cb: any) => cb(txMock));

    await saveAttendanceSession('ss-1', '2026-03-01', [
      { studentId: 'student-1', status: 'present' },
    ]);
    await saveAttendanceSession('ss-1', '2026-03-01', [
      { studentId: 'student-1', status: 'late' },
    ]);

    assert.equal(txMock.attendanceSession.upsert.mock.callCount(), 2);
    const first = txMock.attendanceSession.upsert.mock.calls[0]?.arguments[0] as any;
    const second = txMock.attendanceSession.upsert.mock.calls[1]?.arguments[0] as any;
    assert.deepEqual(first.where, second.where);
  });

  it('persiste takenById y actorUserId para trazabilidad (R006)', async () => {
    resetAllMocks();

    authMock.mock.mockImplementation(async () => ({
      user: { id: 'u-admin-1', tenantSlug: 'school-a', role: 'admin' },
    }));
    prismaMock.tenant.findUnique.mock.mockImplementation(async () => ({ id: 'tenant-a', slug: 'school-a' }));
    prismaMock.sectionSubject.findUnique.mock.mockImplementation(async () => ({
      id: 'ss-1',
      tenantId: 'tenant-a',
      sectionId: 'section-a',
    }));

    txMock.attendanceSession.upsert.mock.mockImplementation(async () => ({ id: 'as-1' }));
    txMock.attendanceRecord.upsert.mock.mockImplementation(async () => ({ id: 'ar-1' }));
    txMock.activityEvent.create.mock.mockImplementation(async () => ({ id: 'ev-1' }));

    prismaMock.$transaction.mock.mockImplementation(async (cb: any) => cb(txMock));

    await saveAttendanceSession('ss-1', '2026-03-01', [
      { studentId: 'student-1', status: 'present' },
    ]);

    const sessionArgs = txMock.attendanceSession.upsert.mock.calls[0]?.arguments[0] as any;
    const eventArgs = txMock.activityEvent.create.mock.calls[0]?.arguments[0] as any;

    assert.equal(sessionArgs.create.takenById, 'u-admin-1');
    assert.equal(eventArgs.data.actorUserId, 'u-admin-1');
  });
});
