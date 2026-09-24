import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '@/lib/prisma';

import { enrollStudent, unenrollStudent, reenrollStudent } from '@/actions/enrollment-impl';

function setTestSession(user: { id: string; tenantSlug: string; roles: string[] }) {
  (globalThis as any).__TEST_SESSION__ = { user };
}

function clearTestSession() {
  delete (globalThis as any).__TEST_SESSION__;
}

function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function setupSchool(prefix: string, opts?: { capacity?: number | null }) {
  const tag = uniq(prefix);
  const tenant = await prisma.tenant.create({
    data: { slug: tag, name: `School ${tag}`, timezone: 'America/Panama' },
  });
  const admin = await prisma.user.create({
    data: { email: `${tag}@ex.com`, fullName: 'Admin', passwordHash: 'x', isActive: true },
  });
  await prisma.userMembership.create({ data: { tenantId: tenant.id, userId: admin.id, status: 'active' } });
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
    data: {
      tenantId: tenant.id,
      academicYearId: year.id,
      gradeLevelId: grade.id,
      name: 'A',
      capacity: opts?.capacity ?? null,
    },
  });
  return { tenant, admin, year, grade, section };
}

async function makeStudent(tenantId: string, tag: string) {
  return prisma.student.create({
    data: { tenantId, firstName: 'Ana', lastName: tag, status: 'active' },
  });
}

async function activityCount(tenantId: string) {
  return prisma.activityEvent.count({ where: { tenantId, entityType: 'enrollment' } });
}

async function expectDomainError(promise: Promise<unknown>, code: string) {
  try {
    await promise;
  } catch (e: any) {
    assert.equal(e?.name, 'EnrollmentDomainError');
    assert.equal(e?.code, code);
    return;
  }
  assert.fail(`esperaba EnrollmentDomainError ${code}, la acción resolvió`);
}

describe('enrollment actions contract (S02) — NO mock.module, Postgres real', () => {
  it('rechaza cruces de tenant con TENANT_SCOPE_VIOLATION y no crea ActivityEvent', async () => {
    const schoolA = await setupSchool('t-enr-scope-a');
    const schoolB = await setupSchool('t-enr-scope-b');
    const studentA = await makeStudent(schoolA.tenant.id, 'ScopeA');

    setTestSession({ id: schoolA.admin.id, tenantSlug: schoolA.tenant.slug, roles: ['admin'] });
    try {
      // La sección es de otra escuela: el scope por tenant debe rechazarla.
      await expectDomainError(
        enrollStudent(studentA.id, schoolB.section.id),
        'TENANT_SCOPE_VIOLATION'
      );
      assert.equal(await activityCount(schoolA.tenant.id), 0);
    } finally {
      clearTestSession();
    }
  });

  it('rechaza sobrecupo con CAPACITY_EXCEEDED y no crea ActivityEvent extra', async () => {
    const school = await setupSchool('t-enr-cap', { capacity: 1 });
    const s1 = await makeStudent(school.tenant.id, 'Cap1');
    const s2 = await makeStudent(school.tenant.id, 'Cap2');

    setTestSession({ id: school.admin.id, tenantSlug: school.tenant.slug, roles: ['admin'] });
    try {
      const first = await enrollStudent(s1.id, school.section.id);
      assert.ok(first.id);
      assert.equal(await activityCount(school.tenant.id), 1);

      await expectDomainError(enrollStudent(s2.id, school.section.id), 'CAPACITY_EXCEEDED');

      const enrollments = await prisma.enrollment.count({
        where: { tenantId: school.tenant.id, sectionId: school.section.id },
      });
      assert.equal(enrollments, 1);
      assert.equal(await activityCount(school.tenant.id), 1);
    } finally {
      clearTestSession();
    }
  });

  it('alta crea enrollment.created con tenantId y referencias de dominio', async () => {
    const school = await setupSchool('t-enr-create');
    const student = await makeStudent(school.tenant.id, 'Create');

    setTestSession({ id: school.admin.id, tenantSlug: school.tenant.slug, roles: ['admin'] });
    try {
      const enrollment = await enrollStudent(student.id, school.section.id);
      assert.equal(enrollment.status, 'enrolled');
      assert.equal(enrollment.tenantId, school.tenant.id);

      const event = await prisma.activityEvent.findFirst({
        where: { tenantId: school.tenant.id, entityType: 'enrollment', action: 'enrollment.created' },
      });
      assert.ok(event);
      assert.equal(event!.entityId, enrollment.id);
      const metadata = JSON.parse(String(event!.metadata));
      assert.equal(metadata.studentId, student.id);
      assert.equal(metadata.sectionId, school.section.id);
      assert.equal(metadata.academicYearId, school.year.id);
    } finally {
      clearTestSession();
    }
  });

  it('baja crea enrollment.unenrolled con tenantId y referencias de dominio', async () => {
    const school = await setupSchool('t-enr-unenroll');
    const student = await makeStudent(school.tenant.id, 'Unenroll');

    setTestSession({ id: school.admin.id, tenantSlug: school.tenant.slug, roles: ['admin'] });
    try {
      const enrollment = await enrollStudent(student.id, school.section.id);
      const result = await unenrollStudent(enrollment.id);
      assert.equal(result.status, 'unenrolled');

      const event = await prisma.activityEvent.findFirst({
        where: { tenantId: school.tenant.id, entityType: 'enrollment', action: 'enrollment.unenrolled' },
      });
      assert.ok(event);
      assert.equal(event!.entityId, enrollment.id);
      assert.equal(event!.tenantId, school.tenant.id);
    } finally {
      clearTestSession();
    }
  });

  it('reinscripción entre ciclos crea enrollment.reenrolled y previene duplicado por ciclo', async () => {
    const school = await setupSchool('t-enr-reenroll');
    const student = await makeStudent(school.tenant.id, 'Reenroll');

    setTestSession({ id: school.admin.id, tenantSlug: school.tenant.slug, roles: ['admin'] });
    try {
      const first = await reenrollStudent(student.id, school.section.id);
      assert.equal(first.status, 'reenrolled');

      // El upsert sobre @@unique(tenant, student, año) no duplica por ciclo.
      const second = await reenrollStudent(student.id, school.section.id);
      assert.ok(second.id);

      const rows = await prisma.enrollment.count({
        where: { tenantId: school.tenant.id, studentId: student.id, academicYearId: school.year.id },
      });
      assert.equal(rows, 1);

      const event = await prisma.activityEvent.findFirst({
        where: { tenantId: school.tenant.id, entityType: 'enrollment', action: 'enrollment.reenrolled' },
      });
      assert.ok(event);
    } finally {
      clearTestSession();
    }
  });

  it(
    'revelaría SEG-H4 si corriera: enrollStudent no verifica rol (cualquier sesión inscribe)',
    { skip: 'AUDIT SEG-H4: enrollStudent/unenrollStudent/reenrollStudent no verifican rol' },
    async () => {
      const school = await setupSchool('t-enr-segh4');
      const student = await makeStudent(school.tenant.id, 'SegH4');
      const parent = await prisma.user.create({
        data: { email: `${uniq('parent')}@ex.com`, fullName: 'Padre', passwordHash: 'x', isActive: true },
      });
      await prisma.userMembership.create({
        data: { tenantId: school.tenant.id, userId: parent.id, status: 'active' },
      });

      setTestSession({ id: parent.id, tenantSlug: school.tenant.slug, roles: ['parent'] });
      try {
        // Comportamiento esperado (seguro): un padre sin permiso no puede
        // matricular. Hoy la action no verifica rol e inscribe con éxito,
        // así que este caso FALLA y documenta el bug sin tocar producción.
        await assert.rejects(() => enrollStudent(student.id, school.section.id), /UNAUTHORIZED|FORBIDDEN|ROLE/);
      } finally {
        clearTestSession();
      }
    }
  );

  it(
    'revelaría LOG-C1 si corriera: reinscribir escribe status reenrolled y lecturas solo-enrolled lo pierden',
    { skip: "AUDIT LOG-C1: reenrollStudent escribe status 'reenrolled'; lecturas con status 'enrolled' pierden al alumno" },
    async () => {
      const school = await setupSchool('t-enr-logc1');
      const student = await makeStudent(school.tenant.id, 'LogC1');

      setTestSession({ id: school.admin.id, tenantSlug: school.tenant.slug, roles: ['admin'] });
      try {
        await reenrollStudent(student.id, school.section.id);
        // BUG: el alumno reinscrito debería quedar visible como 'enrolled'
        // para las lecturas que filtran solo ese estado.
        const visible = await prisma.enrollment.findFirst({
          where: { tenantId: school.tenant.id, studentId: student.id, status: 'enrolled' },
        });
        assert.ok(visible);
      } finally {
        clearTestSession();
      }
    }
  );
});
