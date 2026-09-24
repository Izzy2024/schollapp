import prisma from '../src/lib/prisma.ts';

const main = async () => {
  const tenant = await prisma.tenant.findUnique({ where: { slug: 'school-demo' } });
  if (!tenant) {
    console.log('NO_TENANT');
    return;
  }

  const ss = await prisma.sectionSubject.findFirst({
    where: { tenantId: tenant.id },
    select: { id: true },
  });
  if (!ss) {
    console.log('NO_SS');
    return;
  }

  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);

  const session = await prisma.attendanceSession.upsert({
    where: {
      tenantId_sectionId_date: {
        tenantId: tenant.id,
        sectionId: ss.id,
        date,
      },
    },
    update: { takenBy: 'seed-uat', source: 'teacher-web' },
    create: {
      tenantId: tenant.id,
      sectionId: ss.id,
      date,
      takenBy: 'seed-uat',
      source: 'teacher-web',
    },
  });

  const enrollments = await prisma.enrollment.findMany({
    where: { tenantId: tenant.id, sectionId: ss.id, status: 'active' },
    select: { studentId: true },
    take: 5,
  });

  for (const [i, e] of enrollments.entries()) {
    await prisma.attendanceRecord.upsert({
      where: {
        tenantId_attendanceSessionId_studentId: {
          tenantId: tenant.id,
          attendanceSessionId: session.id,
          studentId: e.studentId,
        },
      },
      update: { status: i % 2 === 0 ? 'present' : 'late' },
      create: {
        tenantId: tenant.id,
        attendanceSessionId: session.id,
        studentId: e.studentId,
        status: i % 2 === 0 ? 'present' : 'late',
      },
    });
  }

  const count = await prisma.attendanceRecord.count({
    where: { tenantId: tenant.id, attendanceSessionId: session.id },
  });

  console.log(
    JSON.stringify(
      {
        tenantId: tenant.id,
        sectionSubjectId: ss.id,
        sessionId: session.id,
        records: count,
        date: date.toISOString(),
      },
      null,
      2,
    ),
  );

  await prisma.$disconnect();
};

main();
