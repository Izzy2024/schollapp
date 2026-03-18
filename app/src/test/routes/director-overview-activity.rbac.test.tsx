import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';

let getDirectorRecentActivities: typeof import('@/actions/directorActivity').getDirectorRecentActivities;
let getDirectorOverviewStats: typeof import('@/actions/directorOverview').getDirectorOverviewStats;

function setAuthSession(session: any) {
  (globalThis as any).__TEST_SESSION__ = session;
  (globalThis as any).__TEST_PRISMA__ = {
    tenant: { findUnique: async () => ({ id: 'tenant-a', slug: session.user.tenantSlug }) },
    academicYear: { findFirst: async () => ({ id: 'ay-2026', isActive: true }) },
    enrollment: { count: async () => 10, findMany: async () => [] },
    student: { count: async () => 1 },
    section: { findMany: async () => [], count: async () => 0 },
    gradeLevel: {},
    classRequest: { count: async () => 0 },
    attendanceRecord: { count: async () => 0 },
    activityEvent: { findMany: async () => [], count: async () => 0 },
  };
}

describe('director overview/activity RBAC contract (S05/R001)', () => {
  before(async () => {
    getDirectorRecentActivities = (await import('@/actions/directorActivity')).getDirectorRecentActivities;
    getDirectorOverviewStats = (await import('@/actions/directorOverview')).getDirectorOverviewStats;
  });

  it('permite acceso para director en superficies /director/overview y /director/activity', async () => {
    setAuthSession({ user: { id: 'director-a', role: 'DIRECTOR', tenantSlug: 'school-a' } });

    await assert.doesNotReject(() => getDirectorOverviewStats());
    await assert.doesNotReject(() => getDirectorRecentActivities());
  });

  it('deniega acceso para roles no autorizados con código estable UNAUTHORIZED_ROLE', async () => {
    setAuthSession({ user: { id: 'teacher-a', role: 'TEACHER', tenantSlug: 'school-a' } });

    await assert.rejects(() => getDirectorOverviewStats(), /UNAUTHORIZED_ROLE/);
    await assert.rejects(() => getDirectorRecentActivities(), /UNAUTHORIZED_ROLE/);
  });

  it('evita data leakage cross-tenant forzando tenant de sesión aunque reciba tenantSlug externo', async () => {
    setAuthSession({ user: { id: 'director-a', role: 'DIRECTOR', tenantSlug: 'school-a' } });

    await assert.doesNotReject(() => getDirectorRecentActivities('school-b'));
    await assert.doesNotReject(() => getDirectorOverviewStats('school-b'));
  });
});
