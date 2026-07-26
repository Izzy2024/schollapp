import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Step 8.1 — Tenant + Users + Memberships + Staff
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'school-demo' },
    update: {},
    create: { slug: 'school-demo', name: 'APPSSCHOLL Demo Academy', timezone: 'America/Mexico_City' },
  });

  const usersData = [
    // NOTE: These are dev-only deterministic demo accounts.
    { email: 'admin@demo.com', fullName: 'Administrador Principal', role: 'admin' },
    { email: 'director@demo.com', fullName: 'Director Académico', role: 'director' },
    { email: 'docente1@demo.com', fullName: 'Docente Uno', role: 'docente' },
    { email: 'docente2@demo.com', fullName: 'Docente Dos', role: 'docente' },
    { email: 'docente3@demo.com', fullName: 'Docente Tres', role: 'docente' },
    { email: 'docente4@demo.com', fullName: 'Docente Cuatro', role: 'docente' },
    { email: 'docente5@demo.com', fullName: 'Docente Cinco', role: 'docente' },
    { email: 'alumno@demo.com', fullName: 'Alumno Demo', role: 'alumno' },
    { email: 'padre@demo.com', fullName: 'Padre Demo', role: 'padre' },
    // Extra non-finance user for deterministic RBAC failure visibility scenario in S05 runbook.
    { email: 'docente-rbac@demo.com', fullName: 'Docente Sin Finanzas', role: 'docente' }
  ];

  const createdUsers: Record<string, any> = {};

  for (const u of usersData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        fullName: u.fullName,
        passwordHash: 'demo-hash-123',
        isActive: true,
      },
    });
    createdUsers[u.email] = user;

    await prisma.userMembership.upsert({
      where: { tenantId_userId: { tenantId: tenant.id, userId: user.id } },
      update: {},
      create: { tenantId: tenant.id, userId: user.id, status: 'active' },
    });
  }

  // Step 8.1.1 — RBAC: Permissions + Roles + UserRoles
  // Keep these minimal and stable; UI (menus) and guards can rely on them.
  const permissionCodes = [
    'app:admin',
    'app:director',
    'app:teacher',
    'app:parent',
    'app:student',
    // Granular permissions (RBAC real, adopted incrementally per action — see docs/GAP-ANALYSIS.md)
    'finance:write',
    'students:manage',
    'staff:manage',
    'invitations:manage',
    'grades:write',
    'attendance:write',
  ];

  const permissions: Record<string, any> = {};
  for (const code of permissionCodes) {
    permissions[code] = await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: `Base permission for ${code}` },
    });
  }

  const roleDefs = [
    { name: 'admin', permissions: ['app:admin', 'finance:write', 'students:manage', 'staff:manage', 'invitations:manage', 'grades:write', 'attendance:write'] },
    { name: 'director', permissions: ['app:director', 'finance:write', 'students:manage', 'invitations:manage', 'grades:write', 'attendance:write'] },
    { name: 'teacher', permissions: ['app:teacher', 'grades:write', 'attendance:write'] },
    { name: 'parent', permissions: ['app:parent'] },
    { name: 'student', permissions: ['app:student'] },
  ] as const;

  const rolesByName: Record<string, any> = {};
  for (const r of roleDefs) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: r.name } },
      update: {},
      create: { tenantId: tenant.id, name: r.name },
    });
    rolesByName[r.name] = role;

    for (const permCode of r.permissions) {
      const perm = permissions[permCode];
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  const assignRoleByEmail = async (email: string) => {
    const user = createdUsers[email];
    if (!user) return;

    // Map legacy demo labels to canonical DB role names
    const canonicalRole = email.includes('admin')
      ? 'admin'
      : email.includes('director')
        ? 'director'
        : email.includes('docente')
          ? 'teacher'
          : email.includes('padre')
            ? 'parent'
            : email.includes('alumno')
              ? 'student'
              : 'admin';

    const role = rolesByName[canonicalRole];
    await prisma.userRole.upsert({
      where: {
        tenantId_userId_roleId: {
          tenantId: tenant.id,
          userId: user.id,
          roleId: role.id,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        userId: user.id,
        roleId: role.id,
      },
    });
  };

  for (const u of usersData) {
    await assignRoleByEmail(u.email);
  }

  const staffEmails = ['docente1@demo.com', 'docente2@demo.com', 'docente3@demo.com', 'docente4@demo.com', 'docente5@demo.com'];
  const staffDict: Record<string, any> = {};

  for (const email of staffEmails) {
    const user = createdUsers[email];
    let staff = await prisma.staff.findFirst({
      where: { tenantId: tenant.id, userId: user.id }
    });
    if (!staff) {
      staff = await prisma.staff.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          fullName: user.fullName,
          roleLabel: 'Docente',
          isActive: true
        }
      });
    }
    staffDict[email] = staff;
  }

  // Step 8.2 — Academic Year + Terms
  const academicYear = await prisma.academicYear.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: '2025-2026' } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: '2025-2026',
      isActive: true,
      startDate: new Date('2025-08-01T00:00:00Z'),
      endDate: new Date('2026-07-31T23:59:59Z'),
    },
  });

  const termsData = [
    { name: 'Bimestre 1', start: '2025-08-01', end: '2025-10-31' },
    { name: 'Bimestre 2', start: '2025-11-01', end: '2026-01-31' },
    { name: 'Bimestre 3', start: '2026-02-01', end: '2026-04-30' },
  ];

  const terms: Record<string, any> = {};
  for (const t of termsData) {
    let term = await prisma.term.findFirst({
      where: { tenantId: tenant.id, academicYearId: academicYear.id, name: t.name }
    });
    if (!term) {
      term = await prisma.term.create({
        data: {
          tenantId: tenant.id,
          academicYearId: academicYear.id,
          name: t.name,
          startDate: new Date(`${t.start}T00:00:00Z`),
          endDate: new Date(`${t.end}T23:59:59Z`),
        }
      });
    }
    terms[t.name] = term;
  }

  // Step 8.3 — GradeLevels + Sections
  const gradesData = [
    { code: '1P', name: '1° Primaria', sortOrder: 1 },
    { code: '2P', name: '2° Primaria', sortOrder: 2 },
    { code: '3P', name: '3° Primaria', sortOrder: 3 }
  ];
  
  const sectionsList: any[] = [];
  const gradesList: any[] = [];

  for (const g of gradesData) {
    const gradeLevel = await prisma.gradeLevel.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: g.code } },
      update: {},
      create: { tenantId: tenant.id, code: g.code, name: g.name, sortOrder: g.sortOrder },
    });
    gradesList.push(gradeLevel);

    for (const sectionName of ['A', 'B']) {
      const section = await prisma.section.upsert({
        where: {
          tenantId_academicYearId_gradeLevelId_name: {
            tenantId: tenant.id,
            academicYearId: academicYear.id,
            gradeLevelId: gradeLevel.id,
            name: sectionName
          }
        },
        update: {},
        create: {
          tenantId: tenant.id,
          academicYearId: academicYear.id,
          gradeLevelId: gradeLevel.id,
          name: sectionName,
          capacity: 15
        }
      });
      sectionsList.push(section);
    }
  }

  // Step 8.4 — Subjects
  const subjectNames = ['Matemáticas', 'Español', 'Ciencias Naturales', 'Historia', 'Geografía', 'Educación Física', 'Inglés', 'Arte', 'Formación Cívica y Ética'];
  const subjectsDict: Record<string, any> = {};

  for (const sn of subjectNames) {
    const subject = await prisma.subject.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: sn } },
      update: {},
      create: { tenantId: tenant.id, name: sn },
    });
    subjectsDict[sn] = subject;
  }

  // Step 8.5 — SectionSubjects
  const subjectStaffMapping: Record<string, string> = {
    'Matemáticas': 'docente1@demo.com',
    'Español': 'docente1@demo.com',
    'Ciencias Naturales': 'docente2@demo.com',
    'Historia': 'docente2@demo.com',
    'Geografía': 'docente3@demo.com',
    'Educación Física': 'docente3@demo.com',
    'Inglés': 'docente4@demo.com',
    'Arte': 'docente4@demo.com',
    'Formación Cívica y Ética': 'docente5@demo.com',
  };

  const sectionSubjectsList: any[] = [];
  for (const section of sectionsList) {
    for (const sn of subjectNames) {
      const subject = subjectsDict[sn];
      const staffEmail = subjectStaffMapping[sn];
      const staff = staffDict[staffEmail];

      const sectionSubject = await prisma.sectionSubject.upsert({
        where: {
          tenantId_sectionId_subjectId: {
            tenantId: tenant.id,
            sectionId: section.id,
            subjectId: subject.id,
          }
        },
        update: { staffId: staff.id },
        create: {
          tenantId: tenant.id,
          sectionId: section.id,
          subjectId: subject.id,
          staffId: staff.id
        }
      });
      sectionSubjectsList.push({ ...sectionSubject, subjectName: sn });
    }
  }

  // Step 8.6 — ClassSchedules
  //
  // Each section needs 2 sessions/week for each of its 9 subjects (18 slots),
  // and no teacher may be double-booked across the sections they cover (a
  // teacher can hold up to 2 subjects × 6 sections × 2 sessions = 24 slots).
  // A single 90-min-block grid only has 5 days × 4 blocks = 20 slots, not
  // enough headroom for the busiest teacher, so this uses 6 blocks/day (30
  // slots/week) and greedily assigns each (section, subject) pair the next
  // slot that's free for BOTH that section (so a student is never double-
  // booked) and that subject's teacher (so a teacher is never double-booked).
  const DAY_NUMBERS = [1, 2, 3, 4, 5];
  const TIME_BLOCKS = [
    { startTime: '07:00', endTime: '08:30' },
    { startTime: '08:30', endTime: '10:00' },
    { startTime: '10:00', endTime: '11:30' },
    { startTime: '11:30', endTime: '13:00' },
    { startTime: '13:00', endTime: '14:30' },
    { startTime: '14:30', endTime: '16:00' },
  ];
  const ALL_WEEK_SLOTS = DAY_NUMBERS.flatMap((dayOfWeek) => TIME_BLOCKS.map((block) => ({ dayOfWeek, ...block })));
  const slotKey = (s: { dayOfWeek: number; startTime: string }) => `${s.dayOfWeek}-${s.startTime}`;

  const teacherUsedSlots: Record<string, Set<string>> = {};
  const sectionUsedSlots: Record<string, Set<string>> = {};

  // Rotate the scan start point each call instead of always trying slot #0
  // first: a fixed order makes every teacher/section greedily pile onto the
  // same early slots, starving whichever pair gets processed last.
  let scanOffset = 0;

  const pickFreeSlots = (teacherEmail: string, sectionId: string, count: number) => {
    teacherUsedSlots[teacherEmail] ??= new Set();
    sectionUsedSlots[sectionId] ??= new Set();
    const picked: typeof ALL_WEEK_SLOTS = [];
    for (let i = 0; i < ALL_WEEK_SLOTS.length; i++) {
      if (picked.length >= count) break;
      const slot = ALL_WEEK_SLOTS[(i + scanOffset) % ALL_WEEK_SLOTS.length];
      const key = slotKey(slot);
      if (teacherUsedSlots[teacherEmail].has(key) || sectionUsedSlots[sectionId].has(key)) continue;
      picked.push(slot);
      teacherUsedSlots[teacherEmail].add(key);
      sectionUsedSlots[sectionId].add(key);
    }
    scanOffset = (scanOffset + 7) % ALL_WEEK_SLOTS.length;
    return picked;
  };

  // Regenerate from scratch each run: the slot-picking above is only
  // conflict-free if it starts from a clean slate, and the old scheduleMapping
  // (or a previous run's assignment) could otherwise leave stale rows behind.
  await prisma.classSchedule.deleteMany({ where: { tenantId: tenant.id } });

  for (const ss of sectionSubjectsList) {
    const staffEmail = subjectStaffMapping[ss.subjectName];
    const slots = pickFreeSlots(staffEmail, ss.sectionId, 2);

    for (const sch of slots) {
      await prisma.classSchedule.create({
        data: {
          tenantId: tenant.id,
          sectionSubjectId: ss.id,
          dayOfWeek: sch.dayOfWeek,
          startTime: sch.startTime,
          endTime: sch.endTime
        }
      });
    }
  }

  // Step 8.7 — Students + Enrollments
  const namePool = [
    'Ana García', 'Luis Martínez', 'Sofía López', 'Carlos Hernández', 'Valentina Torres',
    'Diego Ramírez', 'Isabella Flores', 'Mateo Sánchez', 'Camila Díaz', 'Sebastián Morales',
    'Emilio Ruiz', 'Catalina Herrera', 'Hugo Silva', 'Julia Gómez', 'Andrés Castro',
    'Valeria Rojas', 'Samuel Ortiz', 'Ximena Vargas', 'Martín Romero', 'Daniela Mendoza',
    'Fernando Cruz', 'Luciana Navarro', 'Gabriel Reyes', 'Renata Ávila', 'Tomás Aguilar',
    'Elena Paredes', 'Joaquín Santos', 'Natalia Ríos', 'Matías Fuentes', 'Paula León'
  ];

  let studentIdCounter = 1;
  const enrolledStudentsBySection: Record<string, any[]> = {};

  for (let sIdx = 0; sIdx < sectionsList.length; sIdx++) {
    const section = sectionsList[sIdx];
    enrolledStudentsBySection[section.id] = [];
    for (let i = 0; i < 10; i++) {
      const nameStr = namePool[(sIdx * 10 + i) % namePool.length];
      const [fName, lName] = nameStr.split(' ');
      const code = `STD-${studentIdCounter.toString().padStart(3, '0')}`;
      studentIdCounter++;

      const student = await prisma.student.upsert({
        where: { tenantId_studentCode: { tenantId: tenant.id, studentCode: code } },
        update: {},
        create: {
          tenantId: tenant.id,
          studentCode: code,
          firstName: fName,
          lastName: lName,
          status: 'active'
        }
      });
      enrolledStudentsBySection[section.id].push(student);

      await prisma.enrollment.upsert({
        where: {
          tenantId_studentId_academicYearId: {
            tenantId: tenant.id,
            studentId: student.id,
            academicYearId: academicYear.id
          }
        },
        update: { sectionId: section.id },
        create: {
          tenantId: tenant.id,
          studentId: student.id,
          academicYearId: academicYear.id,
          sectionId: section.id,
          status: 'enrolled'
        }
      });
    }
  }

  // Step 8.7.1 — Demo Guardian + Link to a deterministic Student
  // This enables the /parent/finances happy-path with seeded relationships.
  const demoGuardian = await prisma.guardian.findFirst({
    where: { tenantId: tenant.id, fullName: 'Padre Demo' },
  }).then(async (g) => {
    if (g) return g;
    return prisma.guardian.create({
      data: {
        tenantId: tenant.id,
        fullName: 'Padre Demo',
        relationship: 'Padre',
        email: 'padre@demo.com',
        phone: '555-000-0000',
      },
    });
  });

  // Pick a deterministic seeded student (first created student code STD-001)
  const demoStudent = await prisma.student.findUnique({
    where: { tenantId_studentCode: { tenantId: tenant.id, studentCode: 'STD-001' } },
  });

  if (!demoStudent) {
    throw new Error('Seed invariant failed: expected demo student STD-001 to exist');
  }

  // Link the demo student login (alumno@demo.com) to this deterministic student record,
  // so the student portal resolves "my" data instead of "the first active student in tenant".
  await prisma.student.update({
    where: { id: demoStudent.id },
    data: { email: 'alumno@demo.com' },
  });

  await prisma.studentGuardian.upsert({
    where: {
      tenantId_studentId_guardianId: {
        tenantId: tenant.id,
        studentId: demoStudent.id,
        guardianId: demoGuardian.id,
      },
    },
    update: { isPrimary: true },
    create: {
      tenantId: tenant.id,
      studentId: demoStudent.id,
      guardianId: demoGuardian.id,
      isPrimary: true,
    },
  });

  // Step 8.7.2 — Messaging demo thread (Parent ↔ Teacher)
  // Creates a deterministic conversation so `/parent/messages` and `/teacher/messages` have content.
  const parentUser = createdUsers['padre@demo.com'];
  const teacherUser = createdUsers['docente1@demo.com'];

  if (parentUser && teacherUser) {
    // Find an existing conversation with both participants.
    let convo = await prisma.messageConversation.findFirst({
      where: {
        tenantId: tenant.id,
        AND: [
          { participants: { some: { userId: parentUser.id } } },
          { participants: { some: { userId: teacherUser.id } } },
        ],
      },
    });

    if (!convo) {
      convo = await prisma.messageConversation.create({ data: { tenantId: tenant.id } });
      await prisma.messageParticipant.createMany({
        data: [
          { tenantId: tenant.id, conversationId: convo.id, userId: parentUser.id, lastReadAt: null },
          { tenantId: tenant.id, conversationId: convo.id, userId: teacherUser.id, lastReadAt: null },
        ],
      });
    }

    // Ensure at least one message exists (idempotent by checking latest message)
    const existingMsg = await prisma.message.findFirst({
      where: { tenantId: tenant.id, conversationId: convo.id },
      select: { id: true },
    });

    if (!existingMsg) {
      await prisma.message.createMany({
        data: [
          { tenantId: tenant.id, conversationId: convo.id, senderId: parentUser.id, body: 'Hola profe, ¿hay tarea para esta semana?' },
          { tenantId: tenant.id, conversationId: convo.id, senderId: teacherUser.id, body: 'Hola, sí. Revisen la plataforma el miércoles. Gracias.' },
        ],
      });

      // Touch conversation updatedAt
      await prisma.messageConversation.update({ where: { id: convo.id }, data: {} });
    }
  }

  // Step 8.7.3 — School Calendar demo events (M005/S01)
  // Create some global events visible in /admin/calendar, /teacher/calendar, /parent/calendar
  const adminUser = createdUsers['admin@demo.com'];
  if (adminUser) {
    const existingCal = await prisma.schoolCalendarEvent.findFirst({
      where: { tenantId: tenant.id },
      select: { id: true },
    });

    if (!existingCal) {
      await prisma.schoolCalendarEvent.createMany({
        data: [
          {
            tenantId: tenant.id,
            title: 'Inicio de clases',
            description: 'Bienvenidos al nuevo ciclo escolar.',
            startAt: new Date('2026-08-26T00:00:00.000Z'),
            endAt: null,
            allDay: true,
            createdById: adminUser.id,
          },
          {
            tenantId: tenant.id,
            title: 'Consejo Técnico Escolar',
            description: 'Sin clases para alumnos.',
            startAt: new Date('2026-09-27T00:00:00.000Z'),
            endAt: null,
            allDay: true,
            createdById: adminUser.id,
          },
        ],
      });
    }
  }

  // Step 8.8 — AttendanceSessions + AttendanceRecords
  const getLastValidWeekdays = (count: number) => {
    let days: Date[] = [];
    let cur = new Date();
    while (days.length < count) {
      cur.setDate(cur.getDate() - 1);
      const day = cur.getDay(); // 0 is Sunday, 6 is Saturday
      if (day !== 0 && day !== 6) {
        days.push(new Date(cur));
      }
    }
    return days;
  };
  const last20Days = getLastValidWeekdays(20);

  for (const section of sectionsList) {
    const studentsInSection = enrolledStudentsBySection[section.id];
    for (const dt of last20Days) {
      const dtDate = new Date(dt.toISOString().split('T')[0] + 'T00:00:00Z');
      const session = await prisma.attendanceSession.upsert({
        where: {
          tenantId_sectionId_date: {
            tenantId: tenant.id,
            sectionId: section.id,
            date: dtDate
          }
        },
        update: {},
        create: {
          tenantId: tenant.id,
          sectionId: section.id,
          date: dtDate
        }
      });

      for (let st = 0; st < studentsInSection.length; st++) {
        const student = studentsInSection[st];
        let status = 'present';
        if (st % 20 === 0) status = 'absent';
        else if (st % 20 === 1) status = 'late';

        await prisma.attendanceRecord.upsert({
          where: {
            tenantId_attendanceSessionId_studentId: {
              tenantId: tenant.id,
              attendanceSessionId: session.id,
              studentId: student.id
            }
          },
          update: { status },
          create: {
            tenantId: tenant.id,
            attendanceSessionId: session.id,
            studentId: student.id,
            status
          }
        });
      }
    }
  }

  // Step 8.9 — Evaluations + GradeRecords (Bimestre 1)
  const evalsBim1 = [
    { name: 'Examen Parcial 1', type: 'exam', date: '2025-09-15T00:00:00Z', maxScore: 100 },
    { name: 'Tarea 1', type: 'homework', date: '2025-09-01T00:00:00Z', maxScore: 100 },
    { name: 'Participación Bim 1', type: 'participation', date: '2025-10-31T00:00:00Z', maxScore: 100 },
  ];

  const termBim1 = terms['Bimestre 1'];

  for (const ss of sectionSubjectsList) {
    const students = enrolledStudentsBySection[ss.sectionId];
    for (const e of evalsBim1) {
      const evaluation = await prisma.evaluation.upsert({
        where: {
          tenantId_sectionSubjectId_termId_name: {
            tenantId: tenant.id,
            sectionSubjectId: ss.id,
            termId: termBim1.id,
            name: e.name
          }
        },
        update: { maxScore: e.maxScore },
        create: {
          tenantId: tenant.id,
          sectionSubjectId: ss.id,
          termId: termBim1.id,
          name: e.name,
          type: e.type,
          date: new Date(e.date),
          maxScore: e.maxScore
        }
      });

      for (const student of students) {
        let score = 100;
        if (e.type === 'exam') score = Math.floor(60 + Math.random() * 35);
        if (e.type === 'homework') score = Math.floor(70 + Math.random() * 30);
        if (e.type === 'participation') score = Math.floor(75 + Math.random() * 25);

        await prisma.gradeRecord.upsert({
          where: {
            tenantId_evaluationId_studentId: {
              tenantId: tenant.id,
              evaluationId: evaluation.id,
              studentId: student.id
            }
          },
          update: {}, // don't ruin the randomness if rerunning, or update: {score} if preferred. Let's do nothing on update so seed is truly idempotent
          create: {
            tenantId: tenant.id,
            evaluationId: evaluation.id,
            studentId: student.id,
            score
          }
        });
      }
    }
  }

  // Step 8.10 — CurricularUnits + CurricularTopics (Matemáticas, Bimestre 1)
  for (const ss of sectionSubjectsList) {
    if (ss.subjectName === 'Matemáticas') {
      // Unit 1
      let unit1 = await prisma.curricularUnit.findFirst({
        where: { tenantId: tenant.id, sectionSubjectId: ss.id, termId: termBim1.id, name: 'Números y Operaciones' }
      });
      if (!unit1) {
        unit1 = await prisma.curricularUnit.create({
          data: {
            tenantId: tenant.id,
            sectionSubjectId: ss.id,
            termId: termBim1.id,
            name: 'Números y Operaciones',
            order: 1,
            startDate: new Date('2025-08-01T00:00:00Z'),
            endDate: new Date('2025-08-31T23:59:59Z')
          }
        });
      }

      const topics1 = [
        { name: 'Repaso de operaciones básicas', order: 1 },
        { name: 'Fracciones y decimales', order: 2 },
        { name: 'Resolución de problemas', order: 3 }
      ];
      for (const t of topics1) {
        let topic = await prisma.curricularTopic.findFirst({
          where: { tenantId: tenant.id, unitId: unit1.id, name: t.name }
        });
        if (!topic) {
          await prisma.curricularTopic.create({
            data: {
              tenantId: tenant.id,
              unitId: unit1.id,
              name: t.name,
              order: t.order
            }
          });
        }
      }

      // Unit 2
      let unit2 = await prisma.curricularUnit.findFirst({
        where: { tenantId: tenant.id, sectionSubjectId: ss.id, termId: termBim1.id, name: 'Geometría Básica' }
      });
      if (!unit2) {
        unit2 = await prisma.curricularUnit.create({
          data: {
            tenantId: tenant.id,
            sectionSubjectId: ss.id,
            termId: termBim1.id,
            name: 'Geometría Básica',
            order: 2,
            startDate: new Date('2025-09-01T00:00:00Z'),
            endDate: new Date('2025-09-30T23:59:59Z')
          }
        });
      }

      const topics2 = [
        { name: 'Figuras geométricas', order: 1 },
        { name: 'Perímetro y área', order: 2 },
        { name: 'Ángulos y triángulos', order: 3 }
      ];
      for (const t of topics2) {
        let topic = await prisma.curricularTopic.findFirst({
          where: { tenantId: tenant.id, unitId: unit2.id, name: t.name }
        });
        if (!topic) {
          await prisma.curricularTopic.create({
            data: {
              tenantId: tenant.id,
              unitId: unit2.id,
              name: t.name,
              order: t.order
            }
          });
        }
      }
    }
  }

  console.log('Seeding finished.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
