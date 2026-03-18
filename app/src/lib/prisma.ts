import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

import { getTestPrisma } from '@/lib/test-seams';

// Test override seam: contract tests may inject a lightweight prisma mock.
export default (getTestPrisma<any>() ?? prisma) as typeof prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
