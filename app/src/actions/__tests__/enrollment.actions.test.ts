import { before, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';

const authMock = mock.fn();
const prismaMock = {
  tenant: { findUnique: mock.fn() },
  academicYear: { findFirst: mock.fn() },
  student: { findFirst: mock.fn() },
  section: { findFirst: mock.fn() },
  enrollment: {
    findFirst: mock.fn(),
    create: mock.fn(),
    updateMany: mock.fn(),
  },
  activityEvent: {
    create: mock.fn(),
    count: mock.fn(),
  },
};

mock.module('@/auth', {
  namedExports: {
    auth: authMock,
  },
});

mock.module('@/lib/prisma', {
  defaultExport: prismaMock,
});

let enrollStudent: typeof import('../enrollment').enrollStudent;
let unenrollStudent: typeof import('../enrollment').unenrollStudent;
let reenrollStudent: typeof import('../enrollment').reenrollStudent;
let EnrollmentDomainError: typeof import('../enrollment').EnrollmentDomainError;

function resetAllMocks() {
  authMock.mock.resetCalls();
  prismaMock.tenant.findUnique.mock.resetCalls();
  prismaMock.academicYear.findFirst.mock.resetCalls();
  prismaMock.student.findFirst.mock.resetCalls();
  prismaMock.section.findFirst.mock.resetCalls();
  prismaMock.enrollment.findFirst.mock.resetCalls();
  prismaMock.enrollment.create.mock.resetCalls();
  prismaMock.enrollment.updateMany.mock.resetCalls();
  prismaMock.activityEvent.create.mock.resetCalls();
  prismaMock.activityEvent.count.mock.resetCalls();
}

describe('enrollment actions contract (S02)', () => {
  before(async () => {
    const mod = await import('../enrollment');
    enrollStudent = mod.enrollStudent;
    unenrollStudent = mod.unenrollStudent;
    reenrollStudent = mod.reenrollStudent;
    EnrollmentDomainError = mod.EnrollmentDomainError;
  });
  it('rechaza cruces de tenant con TENANT_SCOPE_VIOLATION y no crea ActivityEvent', async () => {
    resetAllMocks();

    authMock.mock.mockImplementation(async () => ({ user: { id: 'u-1', tenantSlug: 'school-a' } }));
    prismaMock.tenant.findUnique.mock.mockImplementation(async () => ({ id: 'tenant-a', slug: 'school-a' }));
    prismaMock.academicYear.findFirst.mock.mockImplementation(async () => ({ id: 'year-a', tenantId: 'tenant-a', isActive: true }));
    prismaMock.student.findFirst.mock.mockImplementation(async () => null);

    await assert.rejects(
      () => enrollStudent('student-b', 'section-a'),
      (error: unknown) => {
        assert.ok(error instanceof EnrollmentDomainError);
        assert.equal(error.code, 'TENANT_SCOPE_VIOLATION');
        return true;
      }
    );

    assert.equal(prismaMock.activityEvent.create.mock.callCount(), 0);
  });

  it('rechaza sobrecupo con CAPACITY_EXCEEDED y no crea ActivityEvent', async () => {
    resetAllMocks();

    authMock.mock.mockImplementation(async () => ({ user: { id: 'u-1', tenantSlug: 'school-a' } }));
    prismaMock.tenant.findUnique.mock.mockImplementation(async () => ({ id: 'tenant-a', slug: 'school-a' }));
    prismaMock.academicYear.findFirst.mock.mockImplementation(async () => ({ id: 'year-a', tenantId: 'tenant-a', isActive: true }));
    prismaMock.student.findFirst.mock.mockImplementation(async () => ({ id: 'student-a', tenantId: 'tenant-a' }));
    prismaMock.section.findFirst.mock.mockImplementation(async () => ({
      id: 'section-a',
      tenantId: 'tenant-a',
      academicYearId: 'year-a',
      capacity: 1,
      _count: { enrollments: 1 },
    }));
    prismaMock.enrollment.findFirst.mock.mockImplementation(async () => null);

    await assert.rejects(
      () => enrollStudent('student-a', 'section-a'),
      (error: unknown) => {
        assert.ok(error instanceof EnrollmentDomainError);
        assert.equal(error.code, 'CAPACITY_EXCEEDED');
        return true;
      }
    );

    assert.equal(prismaMock.activityEvent.create.mock.callCount(), 0);
  });

  it('alta crea enrollment.created con tenantId y referencias de dominio', async () => {
    resetAllMocks();

    authMock.mock.mockImplementation(async () => ({ user: { id: 'u-1', tenantSlug: 'school-a' } }));
    prismaMock.tenant.findUnique.mock.mockImplementation(async () => ({ id: 'tenant-a', slug: 'school-a' }));
    prismaMock.academicYear.findFirst.mock.mockImplementation(async () => ({ id: 'year-a', tenantId: 'tenant-a', isActive: true }));
    prismaMock.student.findFirst.mock.mockImplementation(async () => ({ id: 'student-a', tenantId: 'tenant-a' }));
    prismaMock.section.findFirst.mock.mockImplementation(async () => ({
      id: 'section-a',
      tenantId: 'tenant-a',
      academicYearId: 'year-a',
      capacity: null,
      _count: { enrollments: 99 },
    }));
    prismaMock.enrollment.findFirst.mock.mockImplementation(async () => null);
    prismaMock.enrollment.create.mock.mockImplementation(async () => ({
      id: 'enroll-1',
      tenantId: 'tenant-a',
      studentId: 'student-a',
      sectionId: 'section-a',
      academicYearId: 'year-a',
      status: 'enrolled',
    }));

    const result = await enrollStudent('student-a', 'section-a');

    assert.equal(result.success, true);
    assert.equal(prismaMock.activityEvent.create.mock.callCount(), 1);
    const eventArgs = prismaMock.activityEvent.create.mock.calls[0]?.arguments[0] as any;
    assert.equal(eventArgs.data.tenantId, 'tenant-a');
    assert.equal(eventArgs.data.action, 'enrollment.created');
  });

  it('baja crea enrollment.unenrolled con tenantId y referencias de dominio', async () => {
    resetAllMocks();

    authMock.mock.mockImplementation(async () => ({ user: { id: 'u-1', tenantSlug: 'school-a' } }));
    prismaMock.tenant.findUnique.mock.mockImplementation(async () => ({ id: 'tenant-a', slug: 'school-a' }));
    prismaMock.enrollment.findFirst.mock.mockImplementation(async () => ({
      id: 'enroll-1',
      tenantId: 'tenant-a',
      studentId: 'student-a',
      sectionId: 'section-a',
      academicYearId: 'year-a',
      status: 'enrolled',
    }));
    prismaMock.enrollment.updateMany.mock.mockImplementation(async () => ({ count: 1 }));

    const result = await unenrollStudent('enroll-1');

    assert.equal(result.success, true);
    assert.equal(prismaMock.activityEvent.create.mock.callCount(), 1);
    const eventArgs = prismaMock.activityEvent.create.mock.calls[0]?.arguments[0] as any;
    assert.equal(eventArgs.data.action, 'enrollment.unenrolled');
    assert.equal(eventArgs.data.tenantId, 'tenant-a');
  });

  it('reinscripción entre ciclos crea enrollment.reenrolled y previene duplicado por ciclo', async () => {
    resetAllMocks();

    authMock.mock.mockImplementation(async () => ({ user: { id: 'u-1', tenantSlug: 'school-a' } }));
    prismaMock.tenant.findUnique.mock.mockImplementation(async () => ({ id: 'tenant-a', slug: 'school-a' }));

    prismaMock.academicYear.findFirst.mock.mockImplementation(async ({ where }: any) => {
      if (where?.isActive === true) {
        return { id: 'year-new', tenantId: 'tenant-a', isActive: true };
      }
      return null;
    });

    prismaMock.student.findFirst.mock.mockImplementation(async () => ({ id: 'student-a', tenantId: 'tenant-a' }));
    prismaMock.section.findFirst.mock.mockImplementation(async () => ({
      id: 'section-new',
      tenantId: 'tenant-a',
      academicYearId: 'year-new',
      capacity: null,
      _count: { enrollments: 0 },
    }));

    prismaMock.enrollment.findFirst.mock.mockImplementation(async ({ where }: any) => {
      if (where?.academicYearId === 'year-new' && where?.status === 'enrolled') {
        return { id: 'existing-in-new-year' };
      }
      return null;
    });

    await assert.rejects(
      () => reenrollStudent('student-a', 'section-new'),
      (error: unknown) => {
        assert.ok(error instanceof EnrollmentDomainError);
        assert.equal(error.code, 'ALREADY_ENROLLED_IN_YEAR');
        return true;
      }
    );

    assert.equal(prismaMock.activityEvent.create.mock.callCount(), 0);

    prismaMock.enrollment.findFirst.mock.resetCalls();
    prismaMock.enrollment.findFirst.mock.mockImplementation(async () => null);
    prismaMock.enrollment.create.mock.mockImplementation(async () => ({ id: 'enroll-new' }));

    const result = await reenrollStudent('student-a', 'section-new');
    assert.equal(result.success, true);
    assert.equal(prismaMock.activityEvent.create.mock.callCount(), 1);
    const eventArgs = prismaMock.activityEvent.create.mock.calls[0]?.arguments[0] as any;
    assert.equal(eventArgs.data.action, 'enrollment.reenrolled');
  });
});