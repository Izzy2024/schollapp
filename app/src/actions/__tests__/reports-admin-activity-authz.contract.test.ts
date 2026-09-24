import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';
import {
  getReportDashboardKPIs,
  getEnrollmentStatsBySection,
  getRecentAttendanceStats,
  exportActiveStudentsCsv,
  getDirectorFinancialSummary,
} from '@/actions/reports';
import { getAdminDashboardStats } from '@/actions/admin';
import { getRecentActivities } from '@/actions/activity';
import { getEnrollmentStats } from '@/actions/directorStats';
import { seedPermission } from '@/test/factories/rbac';
import { STABLE_ERROR } from '@/lib/errors';

function setTestSession(user?: { id: string; email?: string; tenantSlug?: string; roles?: string[] }) {
  if (user) {
    (globalThis as any).__TEST_SESSION__ = { user };
  } else {
    delete (globalThis as any).__TEST_SESSION__;
  }
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

async function createTenantAndUser(namePrefix: string, role = 'student') {
  const now = Date.now();
  const rand = Math.random().toString(36).slice(2);
  const tenant = await prisma.tenant.create({
    data: {
      slug: `${namePrefix}-${now}-${rand}`,
      name: `Colegio ${namePrefix} ${rand}`,
      timezone: 'America/Mexico_City',
    },
  });

  const email = `${namePrefix}-${now}-${rand}@example.com`;
  const user = await prisma.user.create({
    data: {
      email,
      fullName: `User ${namePrefix}`,
      passwordHash: 'hashed_password',
      isActive: true,
    },
  });

  await prisma.userMembership.create({
    data: {
      tenantId: tenant.id,
      userId: user.id,
      status: 'active',
    },
  });

  return { tenant, user, email };
}

describe('Reports, Admin Dashboard & Activity authz contract (Task 1.8)', () => {
  beforeEach(() => {
    clearTestSession();
  });

  it('Sesión student o parent (sin rol admin/director, sin finance:write) rechazada en todas las funciones', async () => {
    const { tenant, user, email } = await createTenantAndUser('t-student-unauth', 'student');

    setTestSession({
      id: user.id,
      email,
      tenantSlug: tenant.slug,
      roles: ['student'],
    });

    // 1. reports.ts
    await assert.rejects(async () => getReportDashboardKPIs(), { message: STABLE_ERROR.UNAUTHORIZED_ROLE });
    await assert.rejects(async () => getEnrollmentStatsBySection(), { message: STABLE_ERROR.UNAUTHORIZED_ROLE });
    await assert.rejects(async () => getRecentAttendanceStats(), { message: STABLE_ERROR.UNAUTHORIZED_ROLE });
    await assert.rejects(async () => exportActiveStudentsCsv(), { message: STABLE_ERROR.UNAUTHORIZED_ROLE });
    await assert.rejects(async () => getDirectorFinancialSummary(), { message: STABLE_ERROR.UNAUTHORIZED_ROLE });

    // 2. admin.ts
    await assert.rejects(async () => getAdminDashboardStats(), { message: STABLE_ERROR.UNAUTHORIZED_ROLE });

    // 3. activity.ts
    await assert.rejects(async () => getRecentActivities(), { message: STABLE_ERROR.UNAUTHORIZED_ROLE });

    // 4. directorStats.ts
    await assert.rejects(async () => getEnrollmentStats(), { message: STABLE_ERROR.UNAUTHORIZED_ROLE });
  });

  it('Sesión admin/director con permisos correspondientes es aceptada en todas las funciones', async () => {
    const { tenant, user, email } = await createTenantAndUser('t-admin-ok', 'admin');
    await seedPermission(tenant.id, user.id, 'finance:write');

    // Crear año académico activo para que getEnrollmentStats funcione
    const now = Date.now();
    await prisma.academicYear.create({
      data: {
        tenantId: tenant.id,
        name: `Ciclo-${now}`,
        isActive: true,
        startDate: new Date('2026-08-01T00:00:00Z'),
        endDate: new Date('2027-07-31T23:59:59Z'),
      },
    });

    // Crear un alumno con nombre con fórmula maliciosa para probar SEG-L9
    await prisma.student.create({
      data: {
        tenantId: tenant.id,
        studentCode: `STD-${now}`,
        firstName: '=cmd|calc',
        lastName: '+DangerousFormula',
        status: 'active',
      },
    });

    setTestSession({
      id: user.id,
      email,
      tenantSlug: tenant.slug,
      roles: ['admin'],
    });

    // 1. reports.ts
    const kpis = await getReportDashboardKPIs();
    assert.equal(typeof kpis.activeStudents, 'number');

    const enrollStats = await getEnrollmentStatsBySection();
    assert.ok(Array.isArray(enrollStats));

    const attStats = await getRecentAttendanceStats();
    assert.ok(Array.isArray(attStats));

    const csv = await exportActiveStudentsCsv();
    assert.ok(typeof csv === 'string');
    // Verificación SEG-L9: caracteres = y + antepuestos con '
    assert.ok(csv.includes("'=cmd|calc"), 'Debe anteponer apóstrofe a fórmulas que inicien con =');
    assert.ok(csv.includes("'+DangerousFormula"), 'Debe anteponer apóstrofe a fórmulas que inicien con +');

    const finSummary = await getDirectorFinancialSummary();
    assert.equal(typeof finSummary.totalChargesCents, 'number');

    // 2. admin.ts
    const dashStats = await getAdminDashboardStats();
    assert.equal(typeof dashStats.studentsCount, 'number');

    // 3. activity.ts
    const activities = await getRecentActivities();
    assert.ok(Array.isArray(activities.activities));

    // 4. directorStats.ts
    const stats = await getEnrollmentStats();
    assert.equal(typeof stats.totalEnrolled, 'number');
  });

  it('Regresión SEG-H3: admin de tenant A no puede leer feed ni datos de tenant B', async () => {
    const { tenant: tenantA, user: adminA, email: emailA } = await createTenantAndUser('t-act-a', 'admin');
    const { tenant: tenantB, user: adminB } = await createTenantAndUser('t-act-b', 'admin');

    // Emitir eventos de actividad en A y B
    await prisma.activityEvent.create({
      data: {
        tenantId: tenantA.id,
        actorUserId: adminA.id,
        entityType: 'announcement',
        entityId: 'ann-a',
        action: 'action_exclusive_to_a',
      },
    });

    await prisma.activityEvent.create({
      data: {
        tenantId: tenantB.id,
        actorUserId: adminB.id,
        entityType: 'finance',
        entityId: 'fin-b',
        action: 'confidential_action_b',
      },
    });

    // Sesión de admin en A
    setTestSession({
      id: adminA.id,
      email: emailA,
      tenantSlug: tenantA.slug,
      roles: ['admin'],
    });

    const feedA = await getRecentActivities();
    const actions = feedA.activities.map((a: any) => a.action);

    assert.ok(actions.includes('action_exclusive_to_a'), 'Debe incluir actividades de su propio tenant');
    assert.equal(actions.includes('confidential_action_b'), false, 'NUNCA debe filtrar actividades de tenant B');

    // Estructuralmente, getRecentActivities ya no acepta tenantSlug como argumento del cliente.
    // Aunque un atacante intente pasar un slug arbitrario, requireTenant siempre usa la sesión.
  });
});
