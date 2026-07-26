import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { getChildAttendanceSummary } from '@/actions/parent';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[]; email?: string }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

async function makeTenant(slugPrefix: string) {
  const now = Date.now();
  return prisma.tenant.create({
    data: { slug: `${slugPrefix}-${now}-${Math.random().toString(36).slice(2)}`, name: 'Tenant Parent Attendance', timezone: 'America/Mexico_City' },
    select: { id: true, slug: true },
  });
}

describe('Parent attendance access contract — NO mock.module', () => {
  beforeEach(() => {
    delete (globalThis as any).__TEST_PRISMA__;
  });

  it('guardian of the student can view attendance; unrelated guardian cannot', async () => {
    const tenant = await makeTenant('t-pa-access');
    const now = Date.now();

    const section = await prisma.section.create({
      data: {
        tenantId: tenant.id,
        academicYearId: (
          await prisma.academicYear.create({
            data: { tenantId: tenant.id, name: `AY-${now}`, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31') },
          })
        ).id,
        gradeLevelId: (await prisma.gradeLevel.create({ data: { tenantId: tenant.id, code: `G-${now}`, name: '1ro' } })).id,
        name: 'A',
      },
    });

    const student = await prisma.student.create({
      data: { tenantId: tenant.id, firstName: 'Iván', lastName: 'Solís', status: 'active' },
    });

    const session = await prisma.attendanceSession.create({
      data: { tenantId: tenant.id, sectionId: section.id, date: new Date('2026-02-01') },
    });
    await prisma.attendanceRecord.create({
      data: { tenantId: tenant.id, attendanceSessionId: session.id, studentId: student.id, status: 'present' },
    });

    const guardianEmail = `guardian-${now}@ex.com`;
    const guardian = await prisma.guardian.create({ data: { tenantId: tenant.id, fullName: 'Tutor', email: guardianEmail } });
    await prisma.studentGuardian.create({ data: { tenantId: tenant.id, studentId: student.id, guardianId: guardian.id } });
    const guardianUser = await prisma.user.create({
      data: { email: guardianEmail, fullName: 'Tutor', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: guardianUser.id, status: 'active' } });

    setTestSession({ id: guardianUser.id, tenantSlug: tenant.slug, roles: ['parent'], email: guardianEmail });
    const summary = await getChildAttendanceSummary(student.id);
    assert.equal(summary.overallPct, 100);
    clearTestSession();

    const otherEmail = `other-${now}@ex.com`;
    const otherUser = await prisma.user.create({
      data: { email: otherEmail, fullName: 'Otro', passwordHash: 'x', isActive: true },
    });
    await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: otherUser.id, status: 'active' } });

    setTestSession({ id: otherUser.id, tenantSlug: tenant.slug, roles: ['parent'], email: otherEmail });
    await assert.rejects(
      () => getChildAttendanceSummary(student.id),
      /UNAUTHORIZED_ROLE/
    );
    clearTestSession();
  });
});
