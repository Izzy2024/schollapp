'use server';

import { auth } from '@/auth';

import prisma from '@/lib/prisma';

export async function getTeacherDashboardData(tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenantSlugSession = session.user.tenantSlug;
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug || tenantSlugSession },
  });
  
  if (!tenant) throw new Error('Tenant not found');

  const teacherInclude = {
    sectionSubjects: {
      include: {
        subject: true,
        section: {
          include: { gradeLevel: true, enrollments: { where: { status: 'enrolled' } } }
        },
        schedules: {
          orderBy: [{ dayOfWeek: 'asc' as const }, { startTime: 'asc' as const }]
        },
        evaluations: {
          include: { records: true }
        }
      }
    }
  };

  const teacher = await prisma.staff.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [
        { user: { email: 'docente1@demo.com' } },
        { userId: session.user.id }
      ]
    },
    include: teacherInclude,
  });

  if (!teacher) {
    return { teacherName: 'No Teacher Found', teacherRole: 'Docente', classes: [], totalStudents: 0, pendingGrades: 0, todaySessions: 0 };
  }

  let totalStudents = 0;
  let pendingGrades = 0;
  let todaySessions = 0;
  
  const todayDayOfWeek = new Date().getDay(); // 0 = Sun, 1 = Mon, etc.
  const todayDate = new Date();
  todayDate.setHours(0,0,0,0);

  const colorArray = [
    { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', bb: 'border-b-purple-400' },
    { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200', bb: 'border-b-teal-400' },
    { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', bb: 'border-b-red-400' },
    { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', bb: 'border-b-indigo-400' },
    { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', bb: 'border-b-orange-400' }
  ];

  const classes = await Promise.all(teacher.sectionSubjects.map(async (ss, idx) => {
    const studentsCount = ss.section?.enrollments.length || 0;
    totalStudents += studentsCount;

    // Check today sessions using schedules instead of schedulePeriods
    const todayPeriods = ss.schedules.filter(sp => sp.dayOfWeek === todayDayOfWeek);
    todaySessions += todayPeriods.length;
    
    // Find next lesson
    let nextLesson = 'Sin horario configurado';
    if (ss.schedules.length > 0) {
      const todayFuture = ss.schedules.find(sp => sp.dayOfWeek === todayDayOfWeek && sp.startTime > new Date().toLocaleTimeString('en-US', {hour12: false, hour: '2-digit', minute: '2-digit'}));
      if (todayFuture) {
        nextLesson = `Hoy, ${todayFuture.startTime}`;
      } else if (todayPeriods.length > 0) {
        nextLesson = `Hoy, ${todayPeriods[0].startTime}`; // Passed lesson today
      } else {
        const sortedLaterStr = ss.schedules.find(sp => sp.dayOfWeek > todayDayOfWeek);
        if (sortedLaterStr) {
          nextLesson = `Día ${sortedLaterStr.dayOfWeek}, ${sortedLaterStr.startTime}`;
        } else {
          nextLesson = `Día ${ss.schedules[0].dayOfWeek}, ${ss.schedules[0].startTime}`;
        }
      }
    }

    // Pending grades count
    const pendingCount = ss.evaluations.reduce((acc, ev) => {
      const missing = studentsCount - ev.records.length;
      return acc + (missing > 0 ? missing : 0);
    }, 0);
    pendingGrades += pendingCount;

    // Check attendance taken today
    const attendanceSession = await prisma.attendanceSession.findFirst({
      where: {
        sectionId: ss.sectionId,
        date: todayDate
      }
    });
    const allCaughtUp = pendingCount === 0 && !!attendanceSession;

    const color = colorArray[idx % colorArray.length];

    return {
      id: ss.id,
      subject: ss.subject?.name?.toUpperCase() || 'MATERIA',
      subjectColor: `${color.bg} ${color.text} ${color.border}`,
      name: ss.subject?.name || 'Clase',
      grade: `${ss.section?.gradeLevel?.name || ''} • ${ss.section?.name || ''}`,
      students: studentsCount,
      borderColor: color.bb,
      nextLesson,
      topic: 'Sin temas hoy',
      pending: pendingCount > 0 ? pendingCount : undefined,
      allCaughtUp,
    };
  }));

  return {
    teacherName: teacher.fullName,
    teacherRole: teacher.roleLabel || 'Docente',
    classes,
    totalStudents,
    pendingGrades,
    todaySessions
  };
}

export async function getTeacherClassesOptions(tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  // Accept both tenantSlug and tenantId session shapes.
  tenantSlug = session.user.tenantSlug;

  const tenantKey = tenantSlug || session.user.tenantSlug || (session.user as any).tenantId;
  const tenant = await prisma.tenant.findFirst({
    where: {
      OR: [{ slug: tenantKey }, { id: tenantKey }],
    },
  });
  if (!tenant) throw new Error('Tenant not found');

  const teacher = await prisma.staff.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [{ user: { email: 'docente1@demo.com' } }, { userId: session.user.id }],
    },
    include: {
      sectionSubjects: {
        include: { subject: true, section: { include: { gradeLevel: true } } },
      },
    },
  });

  let terms = await prisma.term.findMany({
    where: { tenantId: tenant.id },
    orderBy: { startDate: 'asc' }
  });

  if (terms.length === 0) {
    let currentYear = await prisma.academicYear.findFirst({
      where: { tenantId: tenant.id }
    });

    if (!currentYear) {
      currentYear = await prisma.academicYear.create({
        data: {
          tenantId: tenant.id,
          name: '2024-2025',
          startDate: new Date('2024-08-01'),
          endDate: new Date('2025-07-31')
        }
      });
    }

    const defaultTerm = await prisma.term.create({
      data: {
        tenantId: tenant.id,
        academicYearId: currentYear.id,
        name: 'Ciclo Escolar 2024-2025',
        startDate: new Date('2024-08-01'),
        endDate: new Date('2025-07-31')
      }
    });
    terms = [defaultTerm];
  }

  return {
    classes: (teacher?.sectionSubjects || []).map(ss => ({
      id: ss.id,
      name: `${ss.subject.name} — ${ss.section.gradeLevel.name} ${ss.section.name}`
    })),
    terms: terms.map(t => ({ id: t.id, name: t.name }))
  };
}

export async function getDemoStaffId(tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) return null;

  const teacher = await prisma.staff.findFirst({
    where: {
      tenantId: tenant.id,
      OR: [
        { user: { email: 'docente1@demo.com' } },
        { email: 'docente1@demo.com' }
      ]
    }
  }) ?? await prisma.staff.findFirst({
    where: { tenantId: tenant.id, isActive: true },
    orderBy: { createdAt: 'asc' }
  });

  return teacher?.id || null;
}
