#!/usr/bin/env node
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const startedAt = Date.now();
  const scopeTag = `[S04-E2E ${new Date().toISOString()}]`;

  try {
    console.log(`${scopeTag} phase=preconditions status=running`);

    const tenant = await prisma.tenant.findUnique({ where: { slug: 'school-demo' } });
    assert(tenant, 'PRECONDITION_FAILED: tenant school-demo no existe. Ejecuta seed.');

    const admin = await prisma.user.findUnique({ where: { email: 'admin@demo.com' } });
    const teacher = await prisma.user.findUnique({ where: { email: 'docente1@demo.com' } });
    assert(admin, 'PRECONDITION_FAILED: admin@demo.com no existe.');
    assert(teacher, 'PRECONDITION_FAILED: docente1@demo.com no existe.');

    const activeYear = await prisma.academicYear.findFirst({
      where: { tenantId: tenant.id, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    assert(activeYear, 'PRECONDITION_FAILED: no hay ciclo activo.');

    const sectionSubject = await prisma.sectionSubject.findFirst({
      where: { tenantId: tenant.id, staff: { userId: teacher.id } },
      include: { section: true, subject: true },
      orderBy: { id: 'asc' },
    });
    assert(sectionSubject, 'PRECONDITION_FAILED: docente1 sin sectionSubject asignado.');

    console.log(`${scopeTag} phase=preconditions status=ok tenantId=${tenant.id} sectionId=${sectionSubject.sectionId} sectionSubjectId=${sectionSubject.id}`);

    console.log(`${scopeTag} phase=admin status=running`);
    const studentCode = `S04E2E-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    const student = await prisma.student.upsert({
      where: { tenantId_studentCode: { tenantId: tenant.id, studentCode } },
      update: { firstName: 'S04', lastName: 'Demo Student', status: 'active' },
      create: {
        tenantId: tenant.id,
        studentCode,
        firstName: 'S04',
        lastName: 'Demo Student',
        status: 'active',
      },
    });

    const enrollment = await prisma.enrollment.upsert({
      where: {
        tenantId_studentId_academicYearId: {
          tenantId: tenant.id,
          studentId: student.id,
          academicYearId: activeYear.id,
        },
      },
      update: {
        sectionId: sectionSubject.sectionId,
        status: 'enrolled',
      },
      create: {
        tenantId: tenant.id,
        studentId: student.id,
        academicYearId: activeYear.id,
        sectionId: sectionSubject.sectionId,
        status: 'enrolled',
      },
    });

    assert(enrollment.status === 'enrolled', 'ADMIN_STAGE_FAILED: enrollment no quedó en status enrolled.');
    console.log(`${scopeTag} phase=admin status=ok studentId=${student.id} enrollmentId=${enrollment.id} studentCode=${studentCode}`);

    console.log(`${scopeTag} phase=teacher status=running`);
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    const session = await prisma.attendanceSession.upsert({
      where: {
        tenantId_sectionId_date: {
          tenantId: tenant.id,
          sectionId: sectionSubject.sectionId,
          date,
        },
      },
      update: { takenById: teacher.id },
      create: {
        tenantId: tenant.id,
        sectionId: sectionSubject.sectionId,
        date,
        takenById: teacher.id,
      },
    });

    const attendance = await prisma.attendanceRecord.upsert({
      where: {
        tenantId_attendanceSessionId_studentId: {
          tenantId: tenant.id,
          attendanceSessionId: session.id,
          studentId: student.id,
        },
      },
      update: {
        status: 'present',
        note: 'S04 demo attendance',
      },
      create: {
        tenantId: tenant.id,
        attendanceSessionId: session.id,
        studentId: student.id,
        status: 'present',
        note: 'S04 demo attendance',
      },
    });

    assert(attendance.status === 'present', 'TEACHER_STAGE_FAILED: attendance no quedó en present.');
    console.log(`${scopeTag} phase=teacher status=ok attendanceSessionId=${session.id} attendanceRecordId=${attendance.id}`);

    console.log(`${scopeTag} phase=persistence status=running`);
    const persisted = await prisma.attendanceRecord.findUnique({
      where: {
        tenantId_attendanceSessionId_studentId: {
          tenantId: tenant.id,
          attendanceSessionId: session.id,
          studentId: student.id,
        },
      },
    });
    assert(persisted && persisted.status === 'present', 'PERSISTENCE_STAGE_FAILED: attendance no persistida correctamente.');
    console.log(`${scopeTag} phase=persistence status=ok`);

    const durationMs = Date.now() - startedAt;
    console.log(`${scopeTag} result=pass durationMs=${durationMs}`);
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${scopeTag} result=fail durationMs=${durationMs} error=${message}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
