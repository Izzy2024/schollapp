import test, { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { createCalendarEvent, deleteCalendarEvent, listCalendarEvents } from '@/actions/calendar';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

describe('M005 calendar contracts (tenant/RBAC/range) — NO mock.module', () => {
  beforeEach(() => {
    // Ensure tests use the real prisma client.
    delete (globalThis as any).__TEST_PRISMA__;
  });

  it('RBAC: teacher/parent cannot create/delete; admin can create and delete', async () => {
    const now = Date.now();

    const tenant = await prisma.tenant.create({
      data: { slug: `t-cal-rbac-${now}`, name: 'Tenant Calendar', timezone: 'America/Mexico_City' },
      select: { id: true, slug: true },
    });

    const [admin, teacher, parent] = await Promise.all([
      prisma.user.create({ data: { email: `admin-${now}@ex.com`, fullName: 'Admin', passwordHash: 'demo-hash-123', isActive: true } }),
      prisma.user.create({ data: { email: `teacher-${now}@ex.com`, fullName: 'Teacher', passwordHash: 'demo-hash-123', isActive: true } }),
      prisma.user.create({ data: { email: `parent-${now}@ex.com`, fullName: 'Parent', passwordHash: 'demo-hash-123', isActive: true } }),
    ]);

    await prisma.userMembership.createMany({
      data: [
        { tenantId: tenant.id, userId: admin.id, status: 'active' },
        { tenantId: tenant.id, userId: teacher.id, status: 'active' },
        { tenantId: tenant.id, userId: parent.id, status: 'active' },
      ],
    });

    // Teacher cannot create
    setTestSession({ id: teacher.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    await assert.rejects(
      () => createCalendarEvent({ title: 'Evento', startAt: new Date(), allDay: true }),
      /CALENDAR_FORBIDDEN/i
    );

    // Parent cannot create
    setTestSession({ id: parent.id, tenantSlug: tenant.slug, roles: ['parent'] });
    await assert.rejects(
      () => createCalendarEvent({ title: 'Evento', startAt: new Date(), allDay: true }),
      /CALENDAR_FORBIDDEN/i
    );

    // Admin can create
    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });
    const created = await createCalendarEvent({ title: 'Consejo técnico', startAt: new Date(), allDay: true });
    assert.ok(created?.id);

    // Teacher cannot delete
    setTestSession({ id: teacher.id, tenantSlug: tenant.slug, roles: ['teacher'] });
    await assert.rejects(() => deleteCalendarEvent({ id: created.id }), /CALENDAR_FORBIDDEN/i);

    // Admin can delete
    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });
    const deleted = await deleteCalendarEvent({ id: created.id });
    assert.equal(deleted.id, created.id);

    clearTestSession();
  });

  it('tenant-scope: listCalendarEvents only returns events for session tenant', async () => {
    const now = Date.now();

    const [t1, t2] = await Promise.all([
      prisma.tenant.create({ data: { slug: `t-cal-a-${now}`, name: 'Tenant A', timezone: 'America/Mexico_City' }, select: { id: true, slug: true } }),
      prisma.tenant.create({ data: { slug: `t-cal-b-${now}`, name: 'Tenant B', timezone: 'America/Mexico_City' }, select: { id: true, slug: true } }),
    ]);

    const user = await prisma.user.create({
      data: { email: `u-${now}@ex.com`, fullName: 'User', passwordHash: 'demo-hash-123', isActive: true },
      select: { id: true },
    });

    await prisma.userMembership.createMany({
      data: [
        { tenantId: t1.id, userId: user.id, status: 'active' },
        { tenantId: t2.id, userId: user.id, status: 'active' },
      ],
    });

    const start = new Date('2026-01-01T00:00:00.000Z');
    const end = new Date('2026-01-31T23:59:59.999Z');

    // create one event in each tenant directly via prisma
    await prisma.schoolCalendarEvent.createMany({
      data: [
        { tenantId: t1.id, title: 'A-event', startAt: new Date('2026-01-10T00:00:00.000Z'), allDay: true, createdById: user.id },
        { tenantId: t2.id, title: 'B-event', startAt: new Date('2026-01-10T00:00:00.000Z'), allDay: true, createdById: user.id },
      ],
    });

    // Session tenant A sees only A
    setTestSession({ id: user.id, tenantSlug: t1.slug, roles: ['teacher'] });
    const a = await listCalendarEvents({ startAt: start, endAt: end });
    assert.equal(a.length, 1);
    assert.equal(a[0].title, 'A-event');

    // Session tenant B sees only B
    setTestSession({ id: user.id, tenantSlug: t2.slug, roles: ['teacher'] });
    const b = await listCalendarEvents({ startAt: start, endAt: end });
    assert.equal(b.length, 1);
    assert.equal(b[0].title, 'B-event');

    clearTestSession();
  });

  it('range overlap: event that starts before end and ends after start is included', async () => {
    const now = Date.now();

    const tenant = await prisma.tenant.create({
      data: { slug: `t-cal-range-${now}`, name: 'Tenant Range', timezone: 'America/Mexico_City' },
      select: { id: true, slug: true },
    });

    const admin = await prisma.user.create({
      data: { email: `admin2-${now}@ex.com`, fullName: 'Admin2', passwordHash: 'demo-hash-123', isActive: true },
      select: { id: true },
    });

    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });

    setTestSession({ id: admin.id, tenantSlug: tenant.slug, roles: ['admin'] });

    // Event spans Jan 9-11
    await createCalendarEvent({
      title: 'Evento multi-día',
      startAt: new Date('2026-01-09T12:00:00.000Z'),
      endAt: new Date('2026-01-11T12:00:00.000Z'),
      allDay: false,
    });

    // Query Jan 10 only
    const rows = await listCalendarEvents({
      startAt: new Date('2026-01-10T00:00:00.000Z'),
      endAt: new Date('2026-01-10T23:59:59.999Z'),
    });

    assert.equal(rows.length, 1);
    assert.equal(rows[0].title, 'Evento multi-día');

    clearTestSession();
  });
});
