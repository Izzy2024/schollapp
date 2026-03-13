'use server';

import { auth } from '@/auth';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getGradebookData(sectionSubjectId: string, termId: string, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  if (!sectionSubjectId || !termId) return { evaluations: [], students: [], gradeMatrix: {}, studentAverages: {}, evaluationAverages: {} };

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  const ss = await prisma.sectionSubject.findUnique({
    where: { id: sectionSubjectId },
    include: {
      section: {
        include: {
          enrollments: { where: { status: 'enrolled' }, include: { student: true } }
        }
      },
      evaluations: {
        where: { termId },
        orderBy: { date: 'asc' },
        include: { records: true }
      }
    }
  });

  if (!ss) throw new Error('Clase no encontrada');

  const evaluations = ss.evaluations.map(e => ({
    id: e.id,
    name: e.name,
    type: e.type,
    date: e.date.toISOString(),
    maxScore: e.maxScore
  }));

  const students = ss.section.enrollments.map(e => {
    const grades = ss.evaluations.map(ev => {
      const record = ev.records.find(r => r.studentId === e.student.id);
      return {
        evaluationId: ev.id,
        score: record?.score ?? null
      };
    });
    return {
      id: e.student.id,
      name: `${e.student.firstName} ${e.student.lastName}`,
      grades
    };
  });

  const gradeMatrix: Record<string, Record<string, number | null>> = {};
  const studentAverages: Record<string, number> = {};
  const evaluationAverages: Record<string, number> = {};

  // Initialize Matrix
  students.forEach(st => {
    gradeMatrix[st.id] = {};
    evaluations.forEach(ev => {
      gradeMatrix[st.id][ev.id] = null;
    });
  });

  // Populate Matrix
  ss.evaluations.forEach(ev => {
    let evSum = 0;
    let evCount = 0;
    
    ev.records.forEach(r => {
      if (gradeMatrix[r.studentId]) {
         gradeMatrix[r.studentId][ev.id] = r.score;
      }
      evSum += r.score;
      evCount++;
    });
    
    evaluationAverages[ev.id] = evCount === 0 ? 0 : Math.round(evSum / evCount);
  });

  // Student Averages
  students.forEach(st => {
    let stSum = 0;
    let stCount = 0;
    evaluations.forEach(ev => {
      const score = gradeMatrix[st.id][ev.id];
      if (score !== null) {
        stSum += score;
        stCount++;
      }
    });
    studentAverages[st.id] = stCount === 0 ? 0 : Math.round(stSum / stCount);
  });

  return { evaluations, students, gradeMatrix, studentAverages, evaluationAverages };
}

export async function createEvaluation(
  sectionSubjectId: string,
  termId: string,
  name: string,
  type: string,
  dateIso: string,
  maxScore: number,
  tenantSlug?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  await prisma.evaluation.create({
    data: {
      tenantId: tenant.id,
      sectionSubjectId,
      termId,
      name,
      type,
      date: new Date(dateIso),
      maxScore
    }
  });

  revalidatePath('/teacher/gradebook');
  return { success: true };
}

export async function saveGradeRecord(evaluationId: string, studentId: string, score: number, tenantSlug?: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');
  tenantSlug = session.user.tenantSlug;

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });
  if (!tenant) throw new Error('Tenant not found');

  await prisma.gradeRecord.upsert({
    where: {
      tenantId_evaluationId_studentId: {
        tenantId: tenant.id,
        evaluationId,
        studentId
      }
    },
    update: { score },
    create: {
      tenantId: tenant.id,
      evaluationId,
      studentId,
      score
    }
  });

  return { success: true };
}
