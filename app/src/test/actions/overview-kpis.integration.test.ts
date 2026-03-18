import { before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

let authMock: any;
let prismaMock: any;

let getAdminDashboardStats: typeof import('@/actions/admin').getAdminDashboardStats;

describe('overview KPIs integration contract (S05/R005/R004/R001)', () => {
  before(async () => {
    (globalThis as any).__TEST_SESSION__ = { user: { id: 'admin-a', role: 'ADMIN', tenantSlug: 'school-a' } };
    prismaMock = {
      tenant: { findUnique: async () => ({ id: 'tenant-a', slug: 'school-a' }) },
      student: { count: async () => 123 },
      staff: { count: async () => 17 },
      academicYear: { findFirst: async () => ({ id: 'ay-2026', isActive: true }) },
      section: { count: async () => 8 },
      classRequest: {
        count: async ({ where }: any) => {
          if (where?.status === 'pending') return 9;
          return 0;
        },
      },
      attendanceRecord: {
        calls: [] as any[],
        count: async (args: any) => {
          prismaMock.attendanceRecord.calls.push(args);
          if (args?.where?.status === 'present') return 45;
          return 60;
        },
      },
      activityEvent: { findMany: async () => [] },
    };

    const mod = await import('@/actions/admin');
    getAdminDashboardStats = mod.getAdminDashboardStats;
  });

  beforeEach(() => {
    (globalThis as any).__TEST_PRISMA__ = prismaMock;
  });

  it('calcula asistencia de hoy con ventana UTC diaria y compone pendientes por scope/rol', async () => {
    try {
      const stats = await getAdminDashboardStats();

      // R004: KPI matrícula existente
      assert.equal(stats.studentsCount, 123);

      // R005: KPI asistencia hoy; contrato esperado para T02/T03 = 45/60 => 75%
      assert.equal(stats.attendanceTodayPct, 75);

      // R005 borde de ventana diaria: se espera UTC explícito (no zona local implícita)
      const attendanceWhere = prismaMock.attendanceRecord.calls[0].where;
      const gte = attendanceWhere.attendanceSession.date.gte as Date;
      const lte = attendanceWhere.attendanceSession.date.lte as Date;

      assert.equal(gte.toISOString().endsWith('T00:00:00.000Z'), true);
      assert.equal(lte.toISOString().endsWith('T23:59:59.999Z'), true);

      // R001: pendientes por scope/rol deben exponer desglose, no solo total opaco
      assert.deepEqual((stats as any).pendingBreakdown, {
        classRequests: 9,
        scheduleRequests: 0,
        announcementsToPublish: 0,
        role: 'ADMIN',
        scopeTenantId: 'tenant-a',
      });
    } finally {
      // keep globals for suite lifecycle; cleanup handled by runner
    }
  });
});
