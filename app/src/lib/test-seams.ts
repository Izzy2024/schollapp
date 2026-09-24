export type AuthSession = {
  user?: {
    id: string;
    email?: string;
    role?: string;
    tenantSlug?: string;
    tenantId?: string;
    roles?: string[];
  };
};

export function getTestSession(): AuthSession | null {
  const g = globalThis as unknown as { __TEST_SESSION__?: AuthSession };
  return g.__TEST_SESSION__ ?? null;
}

export function getTestPrisma<T>(): T | null {
  const g = globalThis as unknown as { __TEST_PRISMA__?: T };
  return g.__TEST_PRISMA__ ?? null;
}
