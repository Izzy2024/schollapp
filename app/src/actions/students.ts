'use server';

import { auth } from '@/auth';

import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { startOfMonth, endOfMonth } from 'date-fns';

export async function getStudents(
  tenantSlug?: string, 
  search?: string, 
  gradeCode?: string, 
  sectionName?: string, 
  page = 1, 
  pageSize = 20
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const academicYear = await prisma.academicYear.findFirst({
    where: { tenantId: tenant.id, isActive: true },
  });
  if (!academicYear) throw new Error('No active academic year found');

  const where: Prisma.StudentWhereInput = { tenantId: tenant.id, status: 'active' };

  if (search) {
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { studentCode: { contains: search } }
    ];
  }
  
  // Grade and section filters can be applied directly to the enrollments relation query,
  // but Prisma doesn't perfectly support filtering the parent by a relation's properties in a simple way
  // if we also want to return students *without* enrollments when no filters are applied.
  // Actually, wait, the prompt says "Apply grade/section filter post-query or via nested where on enrollments."
  if (gradeCode || sectionName) {
    where.enrollments = {
      some: {
        academicYearId: academicYear.id,
        status: 'enrolled',
        section: {
          ...(gradeCode ? { gradeLevelId: gradeCode } : {}), // Using gradeLevelId as gradeCode based on UI dropdown
          ...(sectionName ? { id: sectionName } : {}), // Using sectionId as sectionName based on UI dropdown
        }
      }
    };
  }

  const [total, studentsRaw] = await prisma.$transaction([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: {
        enrollments: {
          where: { academicYearId: academicYear.id, status: 'enrolled' },
          include: { section: { include: { gradeLevel: true } } }
        }
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { lastName: 'asc' },
    })
  ]);

  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());

  const attendanceAggregations = await prisma.attendanceRecord.groupBy({
    by: ['studentId', 'status'],
    where: {
      tenantId: tenant.id,
      studentId: { in: studentsRaw.map(s => s.id) },
      attendanceSession: {
        date: { gte: monthStart, lte: monthEnd }
      }
    },
    _count: {
      status: true
    }
  });

  const students = studentsRaw.map(s => {
    const studentAttendance = attendanceAggregations.filter(a => a.studentId === s.id);
    const presentCount = studentAttendance.find(a => a.status === 'present')?._count.status || 0;
    const totalRecords = studentAttendance.reduce((acc, curr) => acc + curr._count.status, 0);
    const attendancePct = totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : null;
    
    return {
      id: s.id,
      studentCode: s.studentCode || '—',
      firstName: s.firstName,
      lastName: s.lastName,
      fullName: `${s.firstName} ${s.lastName}`,
      status: s.status,
      gradeLevelName: s.enrollments[0]?.section.gradeLevel.name,
      sectionName: s.enrollments[0]?.section.name,
      attendancePct,
    };
  });

  return { students, total, page, pageSize };
}


export async function createStudent(
  data: { firstName: string; lastName: string; studentCode?: string; dob?: Date; email?: string; phone?: string },
  tenantSlug?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  let studentCode = data.studentCode;
  if (!studentCode) {
    const count = await prisma.student.count({
      where: { tenantId: tenant.id }
    });
    studentCode = `STD-${String(count + 1).padStart(3, '0')}`;
  } else {
    // Check if duplicate
    const existing = await prisma.student.findFirst({
      where: { tenantId: tenant.id, studentCode }
    });
    if (existing) {
      return { error: 'La matrícula ya está en uso' };
    }
  }

  const student = await prisma.student.create({
    data: {
      tenantId: tenant.id,
      firstName: data.firstName,
      lastName: data.lastName,
      studentCode,
      dob: data.dob,
      email: data.email,
      phone: data.phone,
      status: 'active',
    }
  });

  return { success: true, student };
}

export async function getStudentById(studentId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantSlug },
  });
  if (!tenant) throw new Error('Tenant not found');

  const student = await prisma.student.findUnique({
    where: { id: studentId, tenantId: tenant.id },
    include: {
      guardians: {
        include: { guardian: true }
      },
      enrollments: {
        include: { 
          section: { include: { gradeLevel: true } },
          academicYear: true 
        },
        orderBy: { academicYear: { startDate: 'desc' } }
      }
    }
  });

  return student;
}
