import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';
import { listByPeriod, listOpenChargesForStudent, listStudentsForSelect } from '@/actions/finance/charges';
import { listAll } from '@/actions/finance/payments';
import { getForStudent } from '@/actions/finance/statements';
import { seedPermission } from '@/test/factories/rbac';
import { STABLE_ERROR } from '@/lib/errors';

function setTestSession(user?: { id: string; email?: string; tenantSlug?: string; role?: string; roles?: string[] }) {
  if (user) {
    (globalThis as any).__TEST_SESSION__ = { user };
  } else {
    delete (globalThis as any).__TEST_SESSION__;
  }
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

async function createTenantAndUser(namePrefix: string, role = 'teacher') {
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

describe('Finance reads authorization contract (Task 1.6)', () => {
  beforeEach(() => {
    clearTestSession();
  });

  it('Sin finance:write: listByPeriod, listOpenChargesForStudent, listStudentsForSelect, listAll rechazan con FINANCE_FORBIDDEN', async () => {
    const { tenant, user, email } = await createTenantAndUser('t-fin-no-write', 'teacher');

    setTestSession({
      id: user.id,
      email,
      tenantSlug: tenant.slug,
      roles: ['teacher'],
    });

    await assert.rejects(
      async () => listByPeriod({ periodKey: '2026-09' }),
      (err: any) => err.message === STABLE_ERROR.FINANCE_FORBIDDEN
    );

    await assert.rejects(
      async () => listOpenChargesForStudent('dummy-student-id'),
      (err: any) => err.message === STABLE_ERROR.FINANCE_FORBIDDEN
    );

    await assert.rejects(
      async () => listStudentsForSelect(),
      (err: any) => err.message === STABLE_ERROR.FINANCE_FORBIDDEN
    );

    await assert.rejects(
      async () => listAll(),
      (err: any) => err.message === STABLE_ERROR.FINANCE_FORBIDDEN
    );
  });

  it('Con finance:write: listByPeriod, listOpenChargesForStudent, listStudentsForSelect, listAll tienen acceso permitido', async () => {
    const { tenant, user, email } = await createTenantAndUser('t-fin-admin', 'admin');
    await seedPermission(tenant.id, user.id, 'finance:write');

    setTestSession({
      id: user.id,
      email,
      tenantSlug: tenant.slug,
      roles: ['admin'],
    });

    const periodCharges = await listByPeriod({ periodKey: '2026-09' });
    assert.ok(Array.isArray(periodCharges));

    const openCharges = await listOpenChargesForStudent('non-existent-student');
    assert.deepEqual(openCharges, []);

    const students = await listStudentsForSelect();
    assert.ok(Array.isArray(students));

    const paymentsRes = await listAll();
    assert.ok(Array.isArray(paymentsRes.payments));
    assert.equal(typeof paymentsRes.totalCents, 'number');
  });

  it('getForStudent: padre sin vínculo rechazado; padre vinculado permitido; finance:write permitido para cualquier alumno', async () => {
    const { tenant, user: adminUser, email: adminEmail } = await createTenantAndUser('t-fin-stmt', 'admin');
    await seedPermission(tenant.id, adminUser.id, 'finance:write');

    // Crear 2 alumnos
    const now = Date.now();
    const student1 = await prisma.student.create({
      data: {
        tenantId: tenant.id,
        studentCode: `STD-S1-${now}`,
        firstName: 'Hijo',
        lastName: 'Uno',
        status: 'active',
      },
    });

    const student2 = await prisma.student.create({
      data: {
        tenantId: tenant.id,
        studentCode: `STD-S2-${now}`,
        firstName: 'Hijo',
        lastName: 'Dos',
        status: 'active',
      },
    });

    // Crear un padre y vincularlo SOLO a student1
    const parentEmail = `parent-${now}@ex.com`;
    const parentUser = await prisma.user.create({
      data: {
        email: parentEmail,
        fullName: 'Padre Demo',
        passwordHash: 'x',
        isActive: true,
      },
    });
    await prisma.userMembership.create({
      data: {
        tenantId: tenant.id,
        userId: parentUser.id,
        status: 'active',
      },
    });

    const guardian = await prisma.guardian.create({
      data: {
        tenantId: tenant.id,
        fullName: 'Padre Demo',
        email: parentEmail,
      },
    });

    await prisma.studentGuardian.create({
      data: {
        tenantId: tenant.id,
        studentId: student1.id,
        guardianId: guardian.id,
        isPrimary: true,
      },
    });

    // 1. Sesión del padre: puede ver student1 (vinculado)
    setTestSession({
      id: parentUser.id,
      email: parentEmail,
      tenantSlug: tenant.slug,
      role: 'parent',
      roles: ['parent'],
    });

    const stmt1 = await getForStudent(student1.id);
    assert.ok(stmt1);
    assert.equal(stmt1?.studentId, student1.id);

    // 2. Sesión del padre: NO puede ver student2 (sin vínculo) → FINANCE_FORBIDDEN
    await assert.rejects(
      async () => getForStudent(student2.id),
      (err: any) => err.message === STABLE_ERROR.FINANCE_FORBIDDEN
    );

    // 3. Sesión del usuario con finance:write: puede ver AMBOS alumnos
    setTestSession({
      id: adminUser.id,
      email: adminEmail,
      tenantSlug: tenant.slug,
      roles: ['admin'],
    });

    const stmtAdmin1 = await getForStudent(student1.id);
    assert.ok(stmtAdmin1);
    assert.equal(stmtAdmin1?.studentId, student1.id);

    const stmtAdmin2 = await getForStudent(student2.id);
    assert.ok(stmtAdmin2);
    assert.equal(stmtAdmin2?.studentId, student2.id);
  });
});
