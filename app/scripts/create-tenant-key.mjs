// Generates a one-time activation key for a new school/company to self-provision
// its Tenant via /activar. Run manually by the platform owner — there is no UI for this.
//
// Usage: node --import tsx scripts/create-tenant-key.mjs ["nota opcional, ej. nombre de la escuela"]
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

const KEY_TTL_DAYS = 14;

async function main() {
  const note = process.argv[2] ?? null;
  const key = crypto.randomBytes(9).toString('base64url');
  const expiresAt = new Date(Date.now() + KEY_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.tenantActivationKey.create({ data: { key, note, expiresAt } });

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  console.log(`Clave de activación creada${note ? ` (${note})` : ''}:`);
  console.log(key);
  console.log(`Expira: ${expiresAt.toISOString()}`);
  console.log(`Entrega este enlace a la escuela: ${appUrl}/activar?key=${key}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
