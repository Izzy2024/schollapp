'use server';

import { auth } from '@/auth';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getAttendanceSession(sectionSubjectId: string, dateIso: string, tenantSlug?: string) {
  const authSession = await auth();
  if (!authSession?.user) throw new Error('Unauthorized');
  tenantSlug = authSession.user.tenantSlug;

  if (!sectionSubjectId?.trim()) throw new Error('sectionSubjectId requerido');

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const ss = await prisma.sectionSubject.findUnique({
    where: { id: sectionSubjectId },
    include: {
      section: {
        include: { enrollments: { where: { status: 'enrolled' }, include: { student: true } } }
      }
    }
  });

  if (!ss) throw new Error('Clase no encontrada');

  const date = new Date(dateIso);
  date.setHours(0, 0, 0, 0);

  const session = await prisma.attendanceSession.findFirst({
    where: { sectionId: ss.sectionId, date },
    include: { records: { include: { student: true } } }
  });

  if (session) {
    return {
      session: { id: session.id, date: session.date.toISOString() },
      records: session.records.map(r => ({
        studentId: r.studentId,
        studentName: `${r.student.firstName} ${r.student.lastName}`,
        status: r.status,
        note: r.note
      }))
    };
  }

  return {
    session: null,
    records: ss.section.enrollments.map(e => ({
      studentId: e.student.id,
      studentName: `${e.student.firstName} ${e.student.lastName}`,
      status: null,
      note: null
    }))
  };
}

export async function saveAttendanceSession(
  sectionSubjectId: string,
  dateIso: string,
  records: { studentId: string; status: string; note?: string }[],
  tenantSlug?: string
) {
  const authSession = await auth();
  if (!authSession?.user) throw new Error('Unauthorized');
  tenantSlug = authSession.user.tenantSlug;

  if (!sectionSubjectId?.trim()) throw new Error('sectionSubjectId requerido');

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const ss = await prisma.sectionSubject.findUnique({
    where: { id: sectionSubjectId }
  });

  if (!ss) throw new Error('Clase no encontrada');

  const date = new Date(dateIso);
  date.setHours(0, 0, 0, 0);

  return await prisma.$transaction(async (tx) => {
    const session = await tx.attendanceSession.upsert({
      where: {
        tenantId_sectionId_date: {
          tenantId: tenant.id,
          sectionId: ss.sectionId,
          date
        }
      },
      update: {},
      create: {
        tenantId: tenant.id,
        sectionId: ss.sectionId,
        date
      }
    });

    for (const r of records) {
      await tx.attendanceRecord.upsert({
        where: {
          tenantId_attendanceSessionId_studentId: {
            tenantId: tenant.id,
            attendanceSessionId: session.id,
            studentId: r.studentId
          }
        },
        update: { status: r.status, note: r.note },
        create: {
          tenantId: tenant.id,
          attendanceSessionId: session.id,
          studentId: r.studentId,
          status: r.status,
          note: r.note
        }
      });
    }

    await tx.activityEvent.create({
      data: {
        tenantId: tenant.id,
        action: 'taken',
        entityType: 'attendance',
        entityId: session.id,
        metadata: JSON.stringify({ sectionSubjectId, dateIso })
      }
    });

    revalidatePath(`/teacher/classes/${sectionSubjectId}`);
    return { success: true };
  });
}
