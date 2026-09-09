'use server';

import prisma from '@/lib/prisma';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import { getTenantIdFromSession } from './_shared';

export type FinanceStatementItemDTO = {
  type: 'charge' | 'payment';
  id: string;
  occurredAt: string; // ISO
  amountCents: number;
  currency: string;
  chargeId?: string;
};

export type FinanceStatementChargeDTO = {
  id: string;
  conceptId: string;
  conceptName: string;
  amountCents: number;
  currency: string;
  createdAt: Date;
  dueDate: Date | null;
  periodKey: string | null;
  status: string;
};

export type FinanceStatementPaymentDTO = {
  id: string;
  chargeId: string;
  amountCents: number;
  currency: string;
  paidAt: Date;
  method: string;
  note: string | null;
};

export type FinanceStatementStudentDTO = {
  studentId: string;
  charges: FinanceStatementChargeDTO[];
  payments: FinanceStatementPaymentDTO[];
  items: FinanceStatementItemDTO[];
  totals: {
    chargesCents: number;
    paymentsCents: number;
    balanceDueCents: number;
  };
};

export type FinanceStatementDTO = {
  students: FinanceStatementStudentDTO[];
  totals: {
    chargesCents: number;
    paymentsCents: number;
    balanceDueCents: number;
  };
};

function sumCents(rows: Array<{ amountCents: number }>): number {
  return rows.reduce((acc, r) => acc + (r.amountCents || 0), 0);
}

export async function getForParent(): Promise<FinanceStatementDTO> {
  const ctx = await getTenantIdFromSession();

  const role = ctx.user.role ?? undefined;
  const roles = ctx.user.roles ?? [];
  if (role !== 'parent' && !roles.includes('parent')) throw stableError(STABLE_ERROR.UNAUTHORIZED_ROLE);

  // Prefer guardianId injected into session when available.
  // For the deterministic dev seed, we also support resolving guardianId by the user's email.
  const sessionGuardianId = ('guardianId' in ctx.user ? (ctx.user.guardianId as string | undefined) : undefined) ?? undefined;

  let guardianId = sessionGuardianId;

  if (!guardianId) {
    const email = ctx.user.email as string | undefined;
    if (email) {
      const g = await prisma.guardian.findFirst({ where: { tenantId: ctx.tenantId, email } });
      guardianId = g?.id;
    }
  }

  if (!guardianId) throw stableError(STABLE_ERROR.INVALID_TARGET);

  // Resolve visible students (tenant-scoped) for this guardian.
  const links = await prisma.studentGuardian.findMany({
    where: { tenantId: ctx.tenantId, guardianId },
    select: { studentId: true },
  });

  const studentIds = links.map((l) => l.studentId);
  if (studentIds.length === 0) {
    return { students: [], totals: { chargesCents: 0, paymentsCents: 0, balanceDueCents: 0 } };
  }

  return buildStatementForStudents(ctx.tenantId, studentIds);
}

/**
 * Admin/director-facing statement for a single student (estado de cuenta).
 * Any authenticated tenant staff can read (mirrors the read-access convention
 * used elsewhere in this module — writes are what's role-gated).
 */
export async function getForStudent(studentId: string): Promise<FinanceStatementStudentDTO | null> {
  const ctx = await getTenantIdFromSession();

  const student = await prisma.student.findFirst({ where: { id: studentId, tenantId: ctx.tenantId }, select: { id: true } });
  if (!student) throw stableError(STABLE_ERROR.INVALID_TARGET);

  const result = await buildStatementForStudents(ctx.tenantId, [studentId]);
  return result.students[0] ?? null;
}

async function buildStatementForStudents(tenantId: string, studentIds: string[]): Promise<FinanceStatementDTO> {
  const [charges, payments] = await Promise.all([
    prisma.financeCharge.findMany({
      // Los cargos anulados no cuentan para el saldo del alumno.
      where: { tenantId, studentId: { in: studentIds }, status: { not: 'void' } },
      select: {
        id: true,
        studentId: true,
        conceptId: true,
        concept: { select: { name: true } },
        amountCents: true,
        currency: true,
        createdAt: true,
        dueDate: true,
        periodKey: true,
        status: true,
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    }),
    prisma.financePayment.findMany({
      where: { tenantId, studentId: { in: studentIds } },
      select: { id: true, studentId: true, chargeId: true, amountCents: true, currency: true, paidAt: true, method: true, note: true },
      orderBy: [{ paidAt: 'asc' }, { id: 'asc' }],
    }),
  ]);

  const chargesByStudent = new Map<string, typeof charges>();
  for (const c of charges) {
    const arr = chargesByStudent.get(c.studentId) ?? [];
    arr.push(c);
    chargesByStudent.set(c.studentId, arr);
  }

  const paymentsByStudent = new Map<string, typeof payments>();
  for (const p of payments) {
    const arr = paymentsByStudent.get(p.studentId) ?? [];
    arr.push(p);
    paymentsByStudent.set(p.studentId, arr);
  }

  const students: FinanceStatementStudentDTO[] = [];

  // Deterministic student ordering: by studentId.
  const sortedStudentIds = [...new Set(studentIds)].sort();

  for (const studentId of sortedStudentIds) {
    const sCharges = (chargesByStudent.get(studentId) ?? []).slice();
    const sPayments = (paymentsByStudent.get(studentId) ?? []).slice();

    const chargesCents = sumCents(sCharges);
    const paymentsCents = sumCents(sPayments);
    const balanceDueCents = chargesCents - paymentsCents;

    const items: FinanceStatementItemDTO[] = [];
    for (const c of sCharges) {
      items.push({
        type: 'charge',
        id: c.id,
        occurredAt: c.createdAt.toISOString(),
        amountCents: c.amountCents,
        currency: c.currency,
      });
    }
    for (const p of sPayments) {
      items.push({
        type: 'payment',
        id: p.id,
        occurredAt: p.paidAt.toISOString(),
        amountCents: p.amountCents,
        currency: p.currency,
        chargeId: p.chargeId,
      });
    }

    // Deterministic sort: occurredAt then type then id.
    items.sort((a, b) => {
      if (a.occurredAt !== b.occurredAt) return a.occurredAt.localeCompare(b.occurredAt);
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.id.localeCompare(b.id);
    });

    students.push({
      studentId,
      charges: sCharges.map((c) => ({
        id: c.id,
        conceptId: c.conceptId,
        conceptName: c.concept.name,
        amountCents: c.amountCents,
        currency: c.currency,
        createdAt: c.createdAt,
        dueDate: c.dueDate ?? null,
        periodKey: c.periodKey ?? null,
        status: c.status,
      })),
      payments: sPayments.map((p) => ({
        id: p.id,
        chargeId: p.chargeId,
        amountCents: p.amountCents,
        currency: p.currency,
        paidAt: p.paidAt,
        method: p.method,
        note: p.note ?? null,
      })),
      items,
      totals: { chargesCents, paymentsCents, balanceDueCents },
    });
  }

  const totals = students.reduce(
    (acc, s) => {
      acc.chargesCents += s.totals.chargesCents;
      acc.paymentsCents += s.totals.paymentsCents;
      acc.balanceDueCents += s.totals.balanceDueCents;
      return acc;
    },
    { chargesCents: 0, paymentsCents: 0, balanceDueCents: 0 }
  );

  return { students, totals };
}
