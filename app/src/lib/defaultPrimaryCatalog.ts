import prisma from '@/lib/prisma';

const PRIMARY_GRADES = [
  { code: '1P', name: '1° Primaria', sortOrder: 1 },
  { code: '2P', name: '2° Primaria', sortOrder: 2 },
  { code: '3P', name: '3° Primaria', sortOrder: 3 },
  { code: '4P', name: '4° Primaria', sortOrder: 4 },
  { code: '5P', name: '5° Primaria', sortOrder: 5 },
  { code: '6P', name: '6° Primaria', sortOrder: 6 },
];

const PRIMARY_SUBJECTS = [
  'Matemáticas',
  'Español',
  'Ciencias Naturales',
  'Historia',
  'Geografía',
  'Educación Física',
  'Inglés',
  'Arte',
  'Formación Cívica y Ética',
];

function getDefaultAcademicYearRange() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  const startYear = month >= 8 ? year : year - 1;
  const endYear = startYear + 1;
  return {
    name: `${startYear}-${endYear}`,
    startDate: new Date(`${startYear}-08-01T00:00:00Z`),
    endDate: new Date(`${endYear}-07-31T23:59:59Z`),
  };
}

export async function ensureDefaultPrimaryCatalog(tenantId: string) {
  let academicYear = await prisma.academicYear.findFirst({
    where: { tenantId, isActive: true },
  });

  if (!academicYear) {
    const range = getDefaultAcademicYearRange();
    academicYear = await prisma.academicYear.upsert({
      where: { tenantId_name: { tenantId, name: range.name } },
      update: { isActive: true },
      create: {
        tenantId,
        name: range.name,
        startDate: range.startDate,
        endDate: range.endDate,
        isActive: true,
      },
    });
  }

  const sections: { id: string }[] = [];

  for (const grade of PRIMARY_GRADES) {
    const gradeLevel = await prisma.gradeLevel.upsert({
      where: { tenantId_code: { tenantId, code: grade.code } },
      update: { name: grade.name, sortOrder: grade.sortOrder },
      create: {
        tenantId,
        code: grade.code,
        name: grade.name,
        sortOrder: grade.sortOrder,
      },
    });

    for (const sectionName of ['A', 'B']) {
      const section = await prisma.section.upsert({
        where: {
          tenantId_academicYearId_gradeLevelId_name: {
            tenantId,
            academicYearId: academicYear.id,
            gradeLevelId: gradeLevel.id,
            name: sectionName,
          },
        },
        update: {},
        create: {
          tenantId,
          academicYearId: academicYear.id,
          gradeLevelId: gradeLevel.id,
          name: sectionName,
          capacity: 30,
        },
      });
      sections.push({ id: section.id });
    }
  }

  const subjects: { id: string }[] = [];
  for (const subjectName of PRIMARY_SUBJECTS) {
    const subject = await prisma.subject.upsert({
      where: { tenantId_name: { tenantId, name: subjectName } },
      update: {},
      create: { tenantId, name: subjectName },
    });
    subjects.push({ id: subject.id });
  }

  for (const section of sections) {
    for (const subject of subjects) {
      await prisma.sectionSubject.upsert({
        where: {
          tenantId_sectionId_subjectId: {
            tenantId,
            sectionId: section.id,
            subjectId: subject.id,
          },
        },
        update: {},
        create: {
          tenantId,
          sectionId: section.id,
          subjectId: subject.id,
          staffId: null,
        },
      });
    }
  }
}
