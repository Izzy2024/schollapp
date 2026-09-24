import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

import { getTestPrisma } from '@/lib/test-seams';

// Test override seam: contract tests may inject a lightweight prisma mock. Resolved on every
// access (not once at import) so a suite that sets __TEST_PRISMA__ works regardless of which
// suite imported this module first in the shared test-runner process.
const prismaWithSeam: typeof prisma = new Proxy(prisma, {
  get(realClient, prop) {
    const testClient = getTestPrisma<typeof prisma>();
    // Some suites set the seam to this very export to mean "real DB": avoid resolving to ourselves.
    const client = testClient && testClient !== prismaWithSeam ? testClient : realClient;
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export default prismaWithSeam;

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
