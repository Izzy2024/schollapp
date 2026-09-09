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

// ─── 5. Director Financial Summary ──────────────────────────────────────────

export type DirectorFinancialSummary = {
  totalChargesCents: number;
  totalPaymentsCents: number;
  balanceDueCents: number;
  chargeCount: number;
  paymentCount: number;
  collectionRate: number;
  chargesByStatus: { status: string; count: number; totalCents: number }[];
  topConcepts: { name: string; totalCents: number; count: number }[];
  recentPayments: { id: string; amountCents: number; currency: string; method: string; paidAt: string; studentName: string }[];
};

export async function getDirectorFinancialSummary(): Promise<DirectorFinancialSummary> {
  const { tenantId } = await requireTenantOwner();

  const [charges, payments] = await Promise.all([
    prisma.financeCharge.findMany({
      where: { tenantId },
      select: { id: true, amountCents: true, currency: true, status: true, conceptId: true, concept: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.financePayment.findMany({
      where: { tenantId },
      select: {
        id: true, amountCents: true, currency: true, method: true, paidAt: true,
        student: { select: { firstName: true, lastName: true } },
      },
      orderBy: { paidAt: 'desc' },
      take: 10,
    }),
  ]);

  const totalChargesCents = charges.reduce((s, c) => s + c.amountCents, 0);
  const totalPaymentsCents = payments.reduce((s, p) => s + p.amountCents, 0) + // only last 10 above, need all
    0; // We'll use aggregate for total

  const [totalPaymentsAgg] = await Promise.all([
    prisma.financePayment.aggregate({ where: { tenantId }, _sum: { amountCents: true } }),
  ]);

  const allPaymentsCents = totalPaymentsAgg._sum.amountCents || 0;

  // Group charges by status
  const statusMap = new Map<string, { count: number; totalCents: number }>();
  for (const c of charges) {
    const s = c.status || 'unknown';
    const entry = statusMap.get(s) || { count: 0, totalCents: 0 };
    entry.count++;
    entry.totalCents += c.amountCents;
    statusMap.set(s, entry);
  }
  const chargesByStatus = Array.from(statusMap.entries()).map(([status, v]) => ({ status, ...v }));

  // Top concepts
  const conceptMap = new Map<string, { totalCents: number; count: number }>();
  for (const c of charges) {
    const name = c.concept?.name || 'Sin concepto';
    const entry = conceptMap.get(name) || { totalCents: 0, count: 0 };
    entry.totalCents += c.amountCents;
    entry.count++;
    conceptMap.set(name, entry);
  }
  const topConcepts = Array.from(conceptMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.totalCents - a.totalCents)
    .slice(0, 10);

  const recentPaymentsMapped = payments.map(p => ({
    id: p.id,
    amountCents: p.amountCents,
    currency: p.currency,
    method: p.method,
    paidAt: p.paidAt.toISOString(),
    studentName: `${p.student.firstName} ${p.student.lastName}`,
  }));

  return {
    totalChargesCents,
    totalPaymentsCents: allPaymentsCents,
    balanceDueCents: totalChargesCents - allPaymentsCents,
    chargeCount: charges.length,
    paymentCount: payments.length,
    collectionRate: totalChargesCents > 0 ? Math.round((allPaymentsCents / totalChargesCents) * 100) : 0,
    chargesByStatus,
    topConcepts,
    recentPayments: recentPaymentsMapped,
  };
}
