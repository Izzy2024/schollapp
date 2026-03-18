'use server';

import { auth } from '@/auth';
import prisma from '@/lib/prisma';

// ─── Utilities ────────────────────────────────────────────────────────────────

async function requireTenantOwner() {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  
  const tenant = await prisma.tenant.findUnique({
    where: { slug: session.user.tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  return { session, tenantId: tenant.id };
}

// ─── 1. KPIs Globales ─────────────────────────────────────────────────────────

export async function getReportDashboardKPIs() {
  const { tenantId } = await requireTenantOwner();

  // Active Students
  const activeStudents = await prisma.student.count({
    where: { tenantId, status: 'active' },
  });

  // Active Sections
  const activeYear = await prisma.academicYear.findFirst({
    where: { tenantId, isActive: true },
  });
  const activeSections = activeYear 
    ? await prisma.section.count({ where: { tenantId, academicYearId: activeYear.id } }) 
    : 0;

  // Monthly Attendance %
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const totalRecords = await prisma.attendanceRecord.count({
    where: {
      tenantId,
      attendanceSession: { date: { gte: startOfMonth } }
    }
  });

  const presentRecords = await prisma.attendanceRecord.count({
    where: {
      tenantId,
      status: 'present',
      attendanceSession: { date: { gte: startOfMonth } }
    }
  });

  const monthlyAttendancePct = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : null;

  return { activeStudents, activeSections, monthlyAttendancePct };
}

// ─── 2. Matrícula por Grupo ───────────────────────────────────────────────────

export async function getEnrollmentStatsBySection() {
  const { tenantId } = await requireTenantOwner();

  const activeYear = await prisma.academicYear.findFirst({
    where: { tenantId, isActive: true },
  });
  if (!activeYear) return [];

  const sections = await prisma.section.findMany({
    where: { tenantId, academicYearId: activeYear.id },
    include: {
      gradeLevel: true,
      _count: {
        select: { enrollments: { where: { status: 'enrolled' } } }
      }
    },
    orderBy: [
      { gradeLevel: { sortOrder: 'asc' } },
      { name: 'asc' }
    ]
  });

  return sections.map(s => ({
    id: s.id,
    gradeName: s.gradeLevel.name,
    sectionName: s.name,
    capacity: s.capacity || 0,
    enrolled: s._count.enrollments,
    occupancyPct: (s.capacity && s.capacity > 0) ? Math.round((s._count.enrollments / s.capacity) * 100) : 0,
  }));
}

// ─── 3. Asistencia Reciente (Últimos 7 días) ──────────────────────────────────

export async function getRecentAttendanceStats() {
  const { tenantId } = await requireTenantOwner();
  
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0,0,0,0);

  const activeYear = await prisma.academicYear.findFirst({
    where: { tenantId, isActive: true },
  });
  if (!activeYear) return [];

  const sections = await prisma.section.findMany({
    where: { tenantId, academicYearId: activeYear.id },
    include: { gradeLevel: true }
  });

  const statsList = [];

  for (const s of sections) {
    const total = await prisma.attendanceRecord.count({
      where: {
        tenantId,
        attendanceSession: { sectionId: s.id, date: { gte: sevenDaysAgo } }
      }
    });
    
    const present = await prisma.attendanceRecord.count({
      where: {
        tenantId,
        status: { in: ['present', 'late'] }, // Late is considered present for basic %
        attendanceSession: { sectionId: s.id, date: { gte: sevenDaysAgo } }
      }
    });

    statsList.push({
      sectionId: s.id,
      gradeName: s.gradeLevel.name,
      sectionName: s.name,
      totalRecords: total,
      attendancePct: total > 0 ? Math.round((present / total) * 100) : null,
    });
  }

  // Sort by lowest attendance first to highlight areas needing attention
  return statsList
    .filter(s => s.totalRecords > 0)
    .sort((a, b) => (a.attendancePct || 0) - (b.attendancePct || 0));
}

// ─── 4. CSV Export (MVP) ──────────────────────────────────────────────────────

export async function exportActiveStudentsCsv() {
  const { tenantId } = await requireTenantOwner();

  const students = await prisma.student.findMany({
    where: { tenantId, status: 'active' },
    include: {
      enrollments: {
        where: { status: 'enrolled' },
        include: {
          section: {
            include: { gradeLevel: true }
          }
        },
        take: 1
      }
    },
    orderBy: [
      { lastName: 'asc' },
      { firstName: 'asc' }
    ]
  });

  const lines = ['Matricula,Nombre,Apellidos,Grado,Grupo,Estatus'];
  
  students.forEach(st => {
    const matricula = st.studentCode || '';
    const name = st.firstName.replace(/,/g, '');
    const lastName = st.lastName.replace(/,/g, '');
    const activeEnrollment = st.enrollments[0];
    const grado = activeEnrollment ? activeEnrollment.section.gradeLevel.name : 'Sin inscribir';
    const grupo = activeEnrollment ? activeEnrollment.section.name : '-';
    const estatus = st.status;

    lines.push(`${matricula},${name},${lastName},${grado},${grupo},${estatus}`);
  });

  return lines.join('\n');
}
