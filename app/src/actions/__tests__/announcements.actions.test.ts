import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import {
  createAnnouncement,
  publishAnnouncement,
  deleteAnnouncement,
} from '@/actions/announcements';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function setupSchool(prefix: string) {
  const tag = uniq(prefix);
  const tenant = await prisma.tenant.create({
    data: { slug: tag, name: `School ${tag}`, timezone: 'America/Panama' },
  });
  const admin = await prisma.user.create({
    data: { email: `${tag}-admin@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });
  const director = await prisma.user.create({
    data: { email: `${tag}-director@ex.com`, fullName: 'Director', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: director.id, status: 'active' } });
  const teacher = await prisma.user.create({
    data: { email: `${tag}-teacher@ex.com`, fullName: 'Teacher', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: teacher.id, status: 'active' } });
  const year = await prisma.academicYear.create({
    data: {
      tenantId: tenant.id,
      name: `2026-${tag}`,
      startDate: new Date('2026-03-01T00:00:00Z'),
      endDate: new Date('2026-12-15T00:00:00Z'),
      isActive: true,
    },
  });
  const grade = await prisma.gradeLevel.create({
    data: { tenantId: tenant.id, code: `G1-${tag}`, name: 'Primero' },
  });
  const section = await prisma.section.create({
    data: { tenantId: tenant.id, academicYearId: year.id, gradeLevelId: grade.id, name: 'A' },
  });
  return { tenant, admin, director, teacher, year, grade, section };
}

describe('announcements actions contract (S04) — NO mock.module, Postgres real', () => {
  it('create: rechaza rol no autorizado con UNAUTHORIZED_ROLE', async () => {
    const school = await setupSchool('t-ann-role');
    setTestSession({ id: school.teacher.id, tenantSlug: school.tenant.slug, roles: ['teacher'] });
    try {
      await assert.rejects(
        () =>
          createAnnouncement({
            title: 'Comunicado',
            body: 'Contenido',
            publishNow: false,
            targetType: 'all',
          }),
        /UNAUTHORIZED_ROLE/
      );
    } finally {
      clearTestSession();
    }
  });

  it('create: rechaza target inconsistente all + targetId con INVALID_TARGET', async () => {
    const school = await setupSchool('t-ann-target');
    setTestSession({ id: school.director.id, tenantSlug: school.tenant.slug, roles: ['director'] });
    try {
      await assert.rejects(
        () =>
          createAnnouncement({
            title: 'Comunicado',
            body: 'Contenido',
            publishNow: false,
            targetType: 'all',
            targetId: school.grade.id,
          }),
        /INVALID_TARGET/
      );
    } finally {
      clearTestSession();
    }
  });

  it('create: rechaza target inexistente con INVALID_TARGET', async () => {
    const school = await setupSchool('t-ann-missing');
    setTestSession({ id: school.director.id, tenantSlug: school.tenant.slug, roles: ['director'] });
    try {
      await assert.rejects(
        () =>
          createAnnouncement({
            title: 'Comunicado',
            body: 'Contenido',
            publishNow: false,
            targetType: 'grade',
            targetId: 'grade-missing-no-existe',
          }),
        /INVALID_TARGET/
      );
    } finally {
      clearTestSession();
    }
  });

  it('create: rechaza target de otro tenant con TARGET_SCOPE_VIOLATION', async () => {
    const schoolA = await setupSchool('t-ann-scope-a');
    const schoolB = await setupSchool('t-ann-scope-b');
    setTestSession({ id: schoolA.director.id, tenantSlug: schoolA.tenant.slug, roles: ['director'] });
    try {
      await assert.rejects(
        () =>
          createAnnouncement({
            title: 'Comunicado',
            body: 'Contenido',
            publishNow: false,
            targetType: 'section',
            targetId: schoolB.section.id,
          }),
        /TARGET_SCOPE_VIOLATION/
      );
    } finally {
      clearTestSession();
    }
  });

  it('create/publish/delete: emiten ActivityEvent namespaced con metadata mínima', async () => {
    const school = await setupSchool('t-ann-events');
    const title = `Comunicado ${uniq('evt')}`;
    setTestSession({ id: school.admin.id, tenantSlug: school.tenant.slug, roles: ['admin'] });
    try {
      const createResult = await createAnnouncement({ title, body: 'Contenido', publishNow: true, targetType: 'all' });
      assert.ok(createResult.success);

      const created = await prisma.announcement.findFirst({
        where: { tenantId: school.tenant.id, title },
        include: { targets: true },
      });
      assert.ok(created);
      assert.ok(created!.publishedAt);
      assert.equal(created!.targets.length, 1);
      assert.equal(created!.targets[0].targetType, 'all');

      const publishResult = await publishAnnouncement(created!.id);
      assert.ok(publishResult.success);

      const published = await prisma.announcement.findUnique({ where: { id: created!.id } });
      assert.ok(published!.publishedAt);

      const deleteResult = await deleteAnnouncement(created!.id);
      assert.ok(deleteResult.success);

      const deleted = await prisma.announcement.findUnique({ where: { id: created!.id } });
      assert.equal(deleted, null);

      const events = await prisma.activityEvent.findMany({
        where: { tenantId: school.tenant.id, entityType: 'announcement', entityId: created!.id },
      });
      assert.equal(events.length, 3);
      const actions = events.map((e) => e.action).sort();
      assert.deepEqual(actions, ['announcement.created', 'announcement.deleted', 'announcement.published']);

      const createEvent = events.find((e) => e.action === 'announcement.created')!;
      const metadata = JSON.parse(String(createEvent.metadata));
      assert.equal(metadata.targetType, 'all');
      assert.equal(metadata.publishedNow, true);
      assert.equal(metadata.actorUserId, school.admin.id);

      const publishEvent = events.find((e) => e.action === 'announcement.published')!;
      assert.equal(publishEvent.entityType, 'announcement');

      const deleteEvent = events.find((e) => e.action === 'announcement.deleted')!;
      assert.equal(deleteEvent.entityType, 'announcement');
    } finally {
      clearTestSession();
    }
  });

});
