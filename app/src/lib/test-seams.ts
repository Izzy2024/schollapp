export type AuthSession = {
  user?: {
    id: string;
    role?: string;
    tenantSlug?: string;
    tenantId?: string;
    roles?: string[];
  };
};

export function getTestSession(): AuthSession | null {
  return ((globalThis as any).__TEST_SESSION__ as AuthSession) ?? null;
}

export function getTestPrisma<T>(): T | null {
  return ((globalThis as any).__TEST_PRISMA__ as T) ?? null;
}
