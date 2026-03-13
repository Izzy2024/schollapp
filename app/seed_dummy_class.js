const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const tenant = await prisma.tenant.findFirst();
  if (!tenant) return console.log("No tenant");

  let term = await prisma.term.findFirst({ where: { tenantId: tenant.id } });
  
  let staff = await prisma.staff.findFirst({ where: { tenantId: tenant.id } });
  if (!staff) {
    staff = await prisma.staff.create({
      data: { tenantId: tenant.id, fullName: 'Juan Pérez', roleLabel: 'Docente' }
    });
  }

  let subject = await prisma.subject.findFirst({ where: { tenantId: tenant.id } });
  if (!subject) {
    subject = await prisma.subject.create({
      data: { tenantId: tenant.id, name: 'Matemáticas Avanzadas', code: 'MAT-301' }
    });
  }

  let grade = await prisma.gradeLevel.findFirst({ where: { tenantId: tenant.id } });
  if (!grade) {
    grade = await prisma.gradeLevel.create({
      data: { tenantId: tenant.id, name: '3ro Preparatoria', level: 'high_school', sortOrder: 3 }
    });
  }
  
  let academicYear = await prisma.academicYear.findFirst({ where: { tenantId: tenant.id } });

  let section = await prisma.section.findFirst({ where: { tenantId: tenant.id } });
  if (!section) {
    section = await prisma.section.create({
      data: { tenantId: tenant.id, gradeLevelId: grade.id, academicYearId: academicYear.id, name: 'Grupo A', capacity: 30 }
    });
  }

  const ss = await prisma.sectionSubject.findFirst({ where: { staffId: staff.id }});
  
  if (!ss) {
    const newSs = await prisma.sectionSubject.create({
      data: {
        tenantId: tenant.id,
        sectionId: section.id,
        subjectId: subject.id,
        staffId: staff.id
      }
    });
    console.log("Created dummy SectionSubject:", newSs.id);
  } else {
    console.log("Teacher already has a class:", ss.id);
  }
}
run().catch(console.error).finally(() => prisma.$disconnect());
