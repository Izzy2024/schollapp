import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';
import {
  getTenantProfile,
  updateTenantProfile,
  getTenantSettings,
  updateTenantSettings,
  importStudentsCsv,
} from '@/actions/settings';
import { seedPermission } from '@/test/factories/rbac';
import { STABLE_ERROR } from '@/lib/errors';

function setTestSession(user?: { id: string; tenantSlug?: string; roles?: string[] }) {
  if (user) {
    (globalThis as any).__TEST_SESSION__ = { user };
  } else {
    delete (globalThis as any).__TEST_SESSION__;
  }
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

async function createTenantAndUser(namePrefix: string) {
  const now = Date.now();
  const rand = Math.random().toString(36).slice(2);
  const tenant = await prisma.tenant.create({
    data: {
      slug: `${namePrefix}-${now}-${rand}`,
      name: `Colegio ${namePrefix} ${rand}`,
      timezone: 'America/Mexico_City',
    },
  });

  const user = await prisma.user.create({
    data: {
      email: `${namePrefix}-${now}-${rand}@example.com`,
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

  return { tenant, user };
}

describe('Settings contract (Task 1.1) — central authz guard & tenant isolation', () => {
  beforeEach(() => {
    clearTestSession();
  });

  it('Admin de tenant A con settings:manage puede leer y actualizar sus propios ajustes', async () => {
    const { tenant, user } = await createTenantAndUser('t-admin-ok');
    await seedPermission(tenant.id, user.id, 'settings:manage');

    setTestSession({
      id: user.id,
      tenantSlug: tenant.slug,
      roles: ['admin'],
    });

    // 1. getTenantProfile
    const profile = await getTenantProfile();
    assert.equal(profile.id, tenant.id);
    assert.equal(profile.name, tenant.name);

    // 2. updateTenantProfile
    const updatedName = `${tenant.name} Modificado`;
    const updateResult = await updateTenantProfile({
      name: updatedName,
      logoUrl: 'https://example.com/logo.png',
    });
    assert.deepEqual(updateResult, { success: true });

    const tenantInDb = await prisma.tenant.findUnique({ where: { id: tenant.id } });
    assert.equal(tenantInDb?.name, updatedName);
    assert.equal(tenantInDb?.logoUrl, 'https://example.com/logo.png');

    // 3. getTenantSettings
    const settingsBefore = await getTenantSettings();
    assert.equal(settingsBefore.panamaRUC, null);

    // 4. updateTenantSettings
    const updateSettingsResult = await updateTenantSettings({
      panamaRUC: '12345678-1',
      panamaDV: '99',
      panamaNIT: 'NIT-999',
      panamaPACApiKey: 'pac_test_key',
    });
    assert.deepEqual(updateSettingsResult, { success: true });

    const settingsAfter = await getTenantSettings();
    assert.equal(settingsAfter.panamaRUC, '12345678-1');
    assert.equal(settingsAfter.panamaDV, '99');
    assert.equal(settingsAfter.panamaNIT, 'NIT-999');
    assert.equal(settingsAfter.panamaPACApiKey, 'pac_test_key');

    // 5. importStudentsCsv
    const csvData = 'matricula,nombres,apellidos,curp,correo\nSTD-SET-01,Pedro,Perez,CURP01,pedro@test.com';
    const importRes = await importStudentsCsv(csvData);
    assert.equal(importRes.success, true);

    const importedStudent = await prisma.student.findUnique({
      where: { tenantId_studentCode: { tenantId: tenant.id, studentCode: 'STD-SET-01' } },
    });
    assert.ok(importedStudent);
    assert.equal(importedStudent?.firstName, 'Pedro');
  });

  it('Un usuario sin settings:manage recibe UNAUTHORIZED_ROLE en mutaciones y ajustes', async () => {
    const { tenant, user } = await createTenantAndUser('t-student-denied');

    setTestSession({
      id: user.id,
      tenantSlug: tenant.slug,
      roles: ['student'],
    });

    // getTenantProfile sí está permitido para cualquier miembro autenticado
    const profile = await getTenantProfile();
    assert.equal(profile.id, tenant.id);

    // Las siguientes 4 deben fallar con UNAUTHORIZED_ROLE
    await assert.rejects(
      async () => updateTenantProfile({ name: 'Hacked Name' }),
      (err: any) => err.message === STABLE_ERROR.UNAUTHORIZED_ROLE
    );

    await assert.rejects(
      async () => getTenantSettings(),
      (err: any) => err.message === STABLE_ERROR.UNAUTHORIZED_ROLE
    );

    await assert.rejects(
      async () => updateTenantSettings({ panamaRUC: 'hacked-ruc' }),
      (err: any) => err.message === STABLE_ERROR.UNAUTHORIZED_ROLE
    );

    await assert.rejects(
      async () => importStudentsCsv('matricula,nombres,apellidos,curp,correo\nHACK,X,Y,Z,h@x.com'),
      (err: any) => err.message === STABLE_ERROR.UNAUTHORIZED_ROLE
    );
  });

  it('Regresión del hallazgo SEG-C1/C2: con sesión de tenant A, las 5 funciones operan SOLO sobre A y nunca B', async () => {
    const { tenant: tenantA, user: adminA } = await createTenantAndUser('t-iso-a');
    const { tenant: tenantB } = await createTenantAndUser('t-iso-b');

    await seedPermission(tenantA.id, adminA.id, 'settings:manage');

    setTestSession({
      id: adminA.id,
      tenantSlug: tenantA.slug,
      roles: ['admin'],
    });

    // 1. getTenantProfile devuelve A, no B
    const profile = await getTenantProfile();
    assert.equal(profile.id, tenantA.id);
    assert.notEqual(profile.id, tenantB.id);

    // 2. updateTenantProfile modifica A, no B
    await updateTenantProfile({ name: 'Nombre A Exclusivo' });
    const checkA = await prisma.tenant.findUnique({ where: { id: tenantA.id } });
    const checkB = await prisma.tenant.findUnique({ where: { id: tenantB.id } });
    assert.equal(checkA?.name, 'Nombre A Exclusivo');
    assert.notEqual(checkB?.name, 'Nombre A Exclusivo');

    // 3. updateTenantSettings modifica A, no B
    await updateTenantSettings({ panamaRUC: 'RUC-SOLO-A' });
    const settingsA = await getTenantSettings();
    assert.equal(settingsA.panamaRUC, 'RUC-SOLO-A');

    const dbTenantB = await prisma.tenant.findUnique({ where: { id: tenantB.id } });
    assert.equal(dbTenantB?.panamaRUC, null);

    // 4. importStudentsCsv importa en A, no en B
    await importStudentsCsv('matricula,nombres,apellidos,curp,correo\nSTD-ISO-01,Maria,Gomez,,');
    const studentInA = await prisma.student.findUnique({
      where: { tenantId_studentCode: { tenantId: tenantA.id, studentCode: 'STD-ISO-01' } },
    });
    const studentInB = await prisma.student.findUnique({
      where: { tenantId_studentCode: { tenantId: tenantB.id, studentCode: 'STD-ISO-01' } },
    });
    assert.ok(studentInA);
    assert.equal(studentInB, null);

    // No existe forma estructural de pasar el slug o tenantId de B a ninguna de las 5 funciones
  });
});
