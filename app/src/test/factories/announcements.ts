export type TenantFixture = {
  id: string;
  slug: string;
};

export type UserFixture = {
  id: string;
  role: 'ADMIN' | 'DIRECTOR' | 'TEACHER';
  tenantSlug: string;
};

export function tenantFixtures() {
  return {
    tenantA: { id: 'tenant-a', slug: 'school-a' } satisfies TenantFixture,
    tenantB: { id: 'tenant-b', slug: 'school-b' } satisfies TenantFixture,
  };
}

export function userFixtures() {
  return {
    adminA: { id: 'user-admin-a', role: 'ADMIN', tenantSlug: 'school-a' } satisfies UserFixture,
    directorA: { id: 'user-director-a', role: 'DIRECTOR', tenantSlug: 'school-a' } satisfies UserFixture,
    teacherA: { id: 'user-teacher-a', role: 'TEACHER', tenantSlug: 'school-a' } satisfies UserFixture,
    directorB: { id: 'user-director-b', role: 'DIRECTOR', tenantSlug: 'school-b' } satisfies UserFixture,
  };
}

export function announcementInputFixture(overrides?: Partial<{
  title: string;
  body: string;
  publishNow: boolean;
  targetType: 'all' | 'grade' | 'section';
  targetId?: string;
}>) {
  return {
    title: 'Comunicado de prueba',
    body: 'Contenido del comunicado de prueba',
    publishNow: false,
    targetType: 'all' as const,
    targetId: undefined,
    ...overrides,
  };
}
