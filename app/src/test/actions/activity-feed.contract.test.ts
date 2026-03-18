import { before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';

let prismaMock: any;
let getRecentActivities: typeof import('@/actions/activity').getRecentActivities;

describe('activity feed contract (S05/R006/R001)', () => {
  before(async () => {
    prismaMock = {
      tenant: {
        findUnique: async ({ where }: any) => {
          if (where.slug === 'school-a') return { id: 'tenant-a', slug: 'school-a' };
          if (where.slug === 'school-b') return { id: 'tenant-b', slug: 'school-b' };
          return null;
        },
      },
      activityEvent: {
        findManyCalls: [] as any[],
        countCalls: [] as any[],
        count: async (args: any) => {
          prismaMock.activityEvent.countCalls.push(args);
          return 4;
        },
        findMany: async (args: any) => {
          prismaMock.activityEvent.findManyCalls.push(args);
          return [
            {
              id: 'evt-1',
              tenantId: 'tenant-a',
              action: 'attendance.taken',
              entityType: 'attendance',
              entityId: 'att-1',
              occurredAt: new Date('2026-03-18T09:00:00.000Z'),
              metadata: '{bad-json',
              actorUser: { fullName: 'Directora A' },
            },
            {
              id: 'evt-2',
              tenantId: 'tenant-a',
              action: 'announcement.created',
              entityType: 'announcement',
              entityId: 'ann-1',
              occurredAt: new Date('2026-03-18T08:00:00.000Z'),
              metadata: '{"targetType":"all"}',
              actorUser: { fullName: 'Admin A' },
            },
            {
              id: 'evt-3',
              tenantId: 'tenant-a',
              action: 'enrollment.created',
              entityType: 'enrollment',
              entityId: 'enr-1',
              occurredAt: new Date('2026-03-18T07:00:00.000Z'),
              metadata: null,
              actorUser: null,
            },
            {
              id: 'evt-cross-tenant',
              tenantId: 'tenant-b',
              action: 'announcement.deleted',
              entityType: 'announcement',
              entityId: 'ann-x',
              occurredAt: new Date('2026-03-17T22:00:00.000Z'),
              metadata: '{"scope":"foreign"}',
              actorUser: { fullName: 'Director B' },
            },
          ];
        },
      },
    };

    (globalThis as any).__TEST_SESSION__ = {
      user: { id: 'dir-a', role: 'DIRECTOR', tenantSlug: 'school-a' },
    };

    const mod = await import('@/actions/activity');
    getRecentActivities = mod.getRecentActivities;
  });

  beforeEach(() => {
    (globalThis as any).__TEST_PRISMA__ = prismaMock;
  });

  it('aplica filtro canónico por action + entityType, orden temporal, fallback metadata y aislamiento tenant', async () => {
    const result = await getRecentActivities(undefined, 'announcement', 1, 50);

    const findWhere = prismaMock.activityEvent.findManyCalls[0].where;
    assert.equal(findWhere.tenantId, 'tenant-a');

    // Contrato S05 esperado: filtro canónico permite action/entityType determinista
    assert.deepEqual(findWhere.OR, [{ entityType: 'announcement' }, { action: { startsWith: 'announcement.' } }]);

    // Contrato S05 esperado: no se filtran eventos de otro tenant en respuesta final
    assert.equal(result.activities.some((a: any) => a.id === 'evt-cross-tenant'), false);

    // Contrato S05 esperado: occurredAt descendente
    const occurred = result.activities.map((a: any) => a.occurredAt);
    assert.deepEqual(occurred, [...occurred].sort((a, b) => (a < b ? 1 : -1)));

    // Contrato S05 esperado: metadata inválida no rompe, retorna fallback explícito
    const withInvalidMetadata = result.activities.find((a: any) => a.id === 'evt-1');
    assert.deepEqual(withInvalidMetadata.metadata, {
      _fallback: true,
      _errorCode: 'ACTIVITY_METADATA_INVALID_JSON',
    });
  });
});
