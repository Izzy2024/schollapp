import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const run = async () => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'school-demo' } });
  if (!tenant) throw new Error('tenant missing');

  const uAdmin = await prisma.user.findUnique({ where: { email: 'admin@demo.com' } });
  const uParent = await prisma.user.findUnique({ where: { email: 'padre@demo.com' } });
  const g = await prisma.guardian.findFirst({ where: { tenantId: tenant.id, email: 'padre@demo.com' } });
  const s = await prisma.student.findUnique({ where: { tenantId_studentCode: { tenantId: tenant.id, studentCode: 'STD-001' } } });
  const link = g && s ? await prisma.studentGuardian.findUnique({ where: { tenantId_studentId_guardianId: { tenantId: tenant.id, studentId: s.id, guardianId: g.id } } }) : null;

  console.log(
    JSON.stringify(
      {
        tenant: !!tenant,
        admin: !!uAdmin,
        parentUser: !!uParent,
        guardian: !!g,
        student: !!s,
        link: !!link,
      },
      null,
      2
    )
  );
};

run().finally(() => prisma.$disconnect());
