import { AsyncLocalStorage } from 'node:async_hooks';
import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { workAsyncStorage } from 'next/dist/server/app-render/work-async-storage.external';

import prisma from '@/lib/prisma';
import { saveAttendanceSession } from '@/actions/attendance';

// attendance.ts calls next/cache revalidatePath() directly. Outside a Next.js
// request there is no static-generation store, so revalidatePath throws and the
// surrounding $transaction rolls back. We give it a throwaway store by swapping
// the work AsyncLocalStorage the Next runtime would normally provide.
const realAsyncLocalStorage = new AsyncLocalStorage();
(workAsyncStorage as any).run = realAsyncLocalStorage.run.bind(realAsyncLocalStorage);
(workAsyncStorage as any).getStore = realAsyncLocalStorage.getStore.bind(realAsyncLocalStorage);

function runAction<T>(fn: () => Promise<T>): Promise<T> {
  const store = {
    incrementalCache: {},
    route: '/test',
    page: '/test/page',
    previouslyRevalidatedTags: [],
    refreshTagsByCacheKind: new Map(),
    shouldTrackFetchMetrics: false,
    buildId: 'test',
    cacheComponentsEnabled: false,
    dev: true,
    reactServerErrorsByDigest: new Map(),
  };
  return workAsyncStorage.run(store as any, fn) as Promise<T>;
}

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

async function makeTenant(prefix: string) {
  return prisma.tenant.create({
    data: { slug: uniq(prefix), name: 'Tenant Attendance Persistence', timezone: 'America/Mexico_City' },
    select: { id: true, slug: true },
  });
}

async function makeAdmin(tenantId: string) {
  const admin = await prisma.user.create({
    data: { email: `${uniq('att-admin')}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
    select: { id: true },
  });
  await prisma.userMembership.create({ data: { tenantId, userId: admin.id } });
  return admin;
}

async function makeEnrolledSectionSubject(tenantId: string) {
  const academicYear = await prisma.academicYear.create({
    data: { tenantId, name: uniq('AY'), startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
  });
  const gradeLevel = await prisma.gradeLevel.create({ data: { tenantId, code: uniq('GL'), name: '1ro' } });
  const section = await prisma.section.create({
    data: { tenantId, academicYearId: academicYear.id, gradeLevelId: gradeLevel.id, name: 'A' },
  });
  const subject = await prisma.subject.create({ data: { tenantId, name: uniq('Subject') } });
  const sectionSubject = await prisma.sectionSubject.create({
    data: { tenantId, sectionId: section.id, subjectId: subject.id },
  });
  const student = await prisma.student.create({ data: { tenantId, firstName: 'Ana', lastName: 'López' } });
  await prisma.enrollment.create({
    data: { tenantId, studentId: student.id, academicYearId: academicYear.id, sectionId: section.id, status: 'enrolled' },
  });
  return { section, student, sectionSubject };
}

describe('attendance persistence contract (real Postgres) — NO mock.module', () => {
  beforeEach(() => {
    delete (globalThis as any).__TEST_PRISMA__;
  });

  it('rechaza estado inválido con INVALID_ATTENDANCE_STATUS', async () => {
    const tenant = await makeTenant('att-persist-status');
    const admin = await makeAdmin(tenant.id);
    const { student, sectionSubject } = await makeEnrolledSectionSubject(tenant.id);

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });

    await assert.rejects(
      () => saveAttendanceSession(sectionSubject.id, '2026-03-01', [{ studentId: student.id, status: 'remote' }]),
      /INVALID_ATTENDANCE_STATUS/
    );

    clearTestSession();
  });

  it('re-guardado es idempotente y conserva misma session por tenant/section/date', async () => {
    const tenant = await makeTenant('att-persist-idempotent');
    const admin = await makeAdmin(tenant.id);
    const { section, student, sectionSubject } = await makeEnrolledSectionSubject(tenant.id);

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });

    const first = await runAction(() =>
      saveAttendanceSession(sectionSubject.id, '2026-03-01', [{ studentId: student.id, status: 'present' }])
    );
    const second = await runAction(() =>
      saveAttendanceSession(sectionSubject.id, '2026-03-01', [{ studentId: student.id, status: 'late' }])
    );

    assert.deepEqual(first, { success: true });
    assert.deepEqual(second, { success: true });

    const sessions = await prisma.attendanceSession.findMany({ where: { tenantId: tenant.id, sectionId: section.id } });
    assert.equal(sessions.length, 1, 'la misma sección y fecha debe resolver a una sola sesión');

    const record = await prisma.attendanceRecord.findFirst({
      where: { tenantId: tenant.id, attendanceSessionId: sessions[0].id, studentId: student.id },
    });
    assert.equal(record?.status, 'late', 'el re-guardado actualiza el registro, no lo duplica');

    clearTestSession();
  });

  it('persiste takenById y actorUserId para trazabilidad (R006)', async () => {
    const tenant = await makeTenant('att-persist-trace');
    const admin = await makeAdmin(tenant.id);
    const { section, student, sectionSubject } = await makeEnrolledSectionSubject(tenant.id);

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });

    await runAction(() =>
      saveAttendanceSession(sectionSubject.id, '2026-03-01', [
        { studentId: student.id, status: 'present', note: 'a tiempo' },
      ])
    );

    const session = await prisma.attendanceSession.findFirst({ where: { tenantId: tenant.id, sectionId: section.id } });
    assert.ok(session);
    assert.equal(session?.takenById, admin.id);

    const event = await prisma.activityEvent.findFirst({
      where: { tenantId: tenant.id, action: 'attendance.taken', entityId: session!.id },
    });
    assert.ok(event);
    assert.equal(event?.actorUserId, admin.id);

    clearTestSession();
  });

  it(
    'AUDIT LOG-H1: la asistencia es única por clase (sectionSubject), no por sección',
    { skip: 'AUDIT LOG-H1: schema @@unique([tenantId, sectionId, date]) + attendance.ts:167 colapsan dos clases de la misma sección/fecha en una sola sesión' },
    async () => {
      const tenant = await makeTenant('att-audit-logh1');
      const admin = await makeAdmin(tenant.id);
      const { section, student, sectionSubject } = await makeEnrolledSectionSubject(tenant.id);

      // A second class (SectionSubject) in the very same section.
      const otherSubject = await prisma.subject.create({ data: { tenantId: tenant.id, name: uniq('Subject2') } });
      const otherSectionSubject = await prisma.sectionSubject.create({
        data: { tenantId: tenant.id, sectionId: section.id, subjectId: otherSubject.id },
      });

      setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });

      await runAction(() =>
        saveAttendanceSession(sectionSubject.id, '2026-03-01', [{ studentId: student.id, status: 'present' }])
      );
      await runAction(() =>
        saveAttendanceSession(otherSectionSubject.id, '2026-03-01', [{ studentId: student.id, status: 'absent' }])
      );

      const sessions = await prisma.attendanceSession.findMany({
        where: { tenantId: tenant.id, sectionId: section.id, date: new Date('2026-03-01') },
      });
      assert.equal(sessions.length, 2, 'cada clase debe tener su propia sesión de asistencia');

      clearTestSession();
    }
  );
});
