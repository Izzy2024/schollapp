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

export type FinanceStatementStudentDTO = {
  studentId: string;
  charges: Array<{ id: string; amountCents: number; currency: string; createdAt: Date; dueDate: Date | null; periodKey: string | null; status: string }>;
  payments: Array<{ id: string; chargeId: string; amountCents: number; currency: string; paidAt: Date; method: string }>;
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

  const guardianId = (ctx.user as any).guardianId as string | undefined;
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

  const [charges, payments] = await Promise.all([
    prisma.financeCharge.findMany({
      where: { tenantId: ctx.tenantId, studentId: { in: studentIds } },
      select: { id: true, studentId: true, amountCents: true, currency: true, createdAt: true, dueDate: true, periodKey: true, status: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    }),
    prisma.financePayment.findMany({
      where: { tenantId: ctx.tenantId, studentId: { in: studentIds } },
      select: { id: true, studentId: true, chargeId: true, amountCents: true, currency: true, paidAt: true, method: true },
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
      charges: sCharges.map((c) => ({ ...c, dueDate: c.dueDate ?? null, periodKey: c.periodKey ?? null } as any)),
      payments: sPayments.map((p) => p as any),
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
