import { before, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

import { announcementInputFixture, tenantFixtures, userFixtures } from '@/test/factories/announcements';

const authMock = mock.fn();
const revalidatePathMock = mock.fn();

const prismaMock = {
  tenant: { findUnique: mock.fn() },
  announcement: { create: mock.fn(), updateMany: mock.fn(), deleteMany: mock.fn(), findFirst: mock.fn() },
  gradeLevel: { findFirst: mock.fn() },
  section: { findFirst: mock.fn() },
  activityEvent: { create: mock.fn() },
};

mock.module('@/auth', { namedExports: { auth: authMock } });
mock.module('next/cache', { namedExports: { revalidatePath: revalidatePathMock } });
mock.module('@/lib/prisma', { defaultExport: prismaMock });

let createAnnouncement: typeof import('../announcements').createAnnouncement;
let publishAnnouncement: typeof import('../announcements').publishAnnouncement;
let deleteAnnouncement: typeof import('../announcements').deleteAnnouncement;

function resetMocks() {
  authMock.mock.resetCalls();
  revalidatePathMock.mock.resetCalls();
  prismaMock.tenant.findUnique.mock.resetCalls();
  prismaMock.announcement.create.mock.resetCalls();
  prismaMock.announcement.updateMany.mock.resetCalls();
  prismaMock.announcement.deleteMany.mock.resetCalls();
  prismaMock.announcement.findFirst.mock.resetCalls();
  prismaMock.gradeLevel.findFirst.mock.resetCalls();
  prismaMock.section.findFirst.mock.resetCalls();
  prismaMock.activityEvent.create.mock.resetCalls();
}

describe('announcements actions contract (S04)', () => {
  before(async () => {
    const mod = await import('../announcements');
    createAnnouncement = mod.createAnnouncement;
    publishAnnouncement = mod.publishAnnouncement;
    deleteAnnouncement = mod.deleteAnnouncement;
  });

  beforeEach(() => {
    resetMocks();
    const { tenantA, tenantB } = tenantFixtures();
    prismaMock.tenant.findUnique.mock.mockImplementation(async ({ where }: any) => {
      if (where.slug === tenantA.slug) return tenantA;
      if (where.slug === tenantB.slug) return tenantB;
      return null;
    });
  });

  it('create: rechaza rol no autorizado con UNAUTHORIZED_ROLE', async () => {
    const { teacherA } = userFixtures();
    authMock.mock.mockImplementation(async () => ({ user: teacherA }));

    await assert.rejects(
      () => createAnnouncement(announcementInputFixture({ targetType: 'all' })),
      /UNAUTHORIZED_ROLE/
    );
  });

  it('create: rechaza target inconsistente all + targetId con INVALID_TARGET', async () => {
    const { directorA } = userFixtures();
    authMock.mock.mockImplementation(async () => ({ user: directorA }));

    await assert.rejects(
      () => createAnnouncement(announcementInputFixture({ targetType: 'all', targetId: 'grade-1' })),
      /INVALID_TARGET/
    );
  });

  it('create: rechaza target inexistente con INVALID_TARGET', async () => {
    const { directorA } = userFixtures();
    authMock.mock.mockImplementation(async () => ({ user: directorA }));
    prismaMock.gradeLevel.findFirst.mock.mockImplementation(async () => null);

    await assert.rejects(
      () => createAnnouncement(announcementInputFixture({ targetType: 'grade', targetId: 'grade-missing' })),
      /INVALID_TARGET/
    );
  });

  it('create: rechaza target de otro tenant con TARGET_SCOPE_VIOLATION', async () => {
    const { directorA } = userFixtures();
    const { tenantB } = tenantFixtures();
    authMock.mock.mockImplementation(async () => ({ user: directorA }));
    prismaMock.section.findFirst.mock.mockImplementation(async () => ({ id: 'sec-b', tenantId: tenantB.id }));

    await assert.rejects(
      () => createAnnouncement(announcementInputFixture({ targetType: 'section', targetId: 'sec-b' })),
      /TARGET_SCOPE_VIOLATION/
    );
  });

  it('create/publish/delete: emiten ActivityEvent namespaced con metadata mínima', async () => {
    const { adminA } = userFixtures();
    const { tenantA } = tenantFixtures();
    authMock.mock.mockImplementation(async () => ({ user: adminA }));

    prismaMock.announcement.create.mock.mockImplementation(async () => ({ id: 'ann-1' }));
    prismaMock.announcement.findFirst.mock.mockImplementation(async ({ where }: any) => {
      if (where.id === 'ann-1' && where.tenantId === tenantA.id) {
        return {
          id: 'ann-1',
          publishedAt: null,
          targets: [{ targetType: 'all', targetId: null }],
        };
      }
      return null;
    });
    prismaMock.announcement.updateMany.mock.mockImplementation(async () => ({ count: 1 }));
    prismaMock.announcement.deleteMany.mock.mockImplementation(async () => ({ count: 1 }));

    await createAnnouncement(announcementInputFixture({ targetType: 'all', publishNow: true }));
    await publishAnnouncement('ann-1');
    await deleteAnnouncement('ann-1');

    assert.equal(prismaMock.activityEvent.create.mock.callCount(), 3);

    const createEvent = prismaMock.activityEvent.create.mock.calls[0].arguments[0] as any;
    const publishEvent = prismaMock.activityEvent.create.mock.calls[1].arguments[0] as any;
    const deleteEvent = prismaMock.activityEvent.create.mock.calls[2].arguments[0] as any;

    assert.equal(createEvent.data.entityType, 'announcement');
    assert.equal(createEvent.data.action, 'announcement.created');
    assert.match(String(createEvent.data.metadata), /targetType/);
    assert.match(String(createEvent.data.metadata), /publishedNow/);
    assert.match(String(createEvent.data.metadata), /actorUserId/);

    assert.equal(publishEvent.data.entityType, 'announcement');
    assert.equal(publishEvent.data.action, 'announcement.published');

    assert.equal(deleteEvent.data.entityType, 'announcement');
    assert.equal(deleteEvent.data.action, 'announcement.deleted');

    assert.equal(revalidatePathMock.mock.callCount(), 3);
  });
});
