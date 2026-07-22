'use server';

import prisma from '@/lib/prisma';
import { assertFinanceWriteAccess, getTenantIdFromSession } from './_shared';

// ============================================================================
// Types
// ============================================================================

export type DelinquentStudent = {
  studentId: string;
  studentName: string;
  studentCode: string | null;
  gradeLevel: string | null;
  totalOverdueCents: number;
  oldestDueDate: Date | null;
  daysOverdue: number;
  charges: {
    id: string;
    conceptName: string;
    amountCents: number;
    dueDate: Date | null;
    daysOverdue: number;
  }[];
};

export type DelinquencySummary = {
  totalOverdueCents: number;
  overdueCount: number;
  studentsAffected: number;
  byDaysOverdue: {
    '1-7': { count: number; total: number };
    '8-15': { count: number; total: number };
    '16-30': { count: number; total: number };
    '31-60': { count: number; total: number };
    '60+': { count: number; total: number };
  };
};

export type DunningEventRecord = {
  id: string;
  chargeId: string;
  action: string;
  performedAt: Date;
  performedByName: string;
  notes: string | null;
};

// ============================================================================
// Actions
// ============================================================================

/**
 * Update overdue status for all charges in tenant
 * Should be called by a cron job or manually
 */
export async function updateOverdueStatuses(): Promise<{ updated: number }> {
  const ctx = await getTenantIdFromSession();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find pending charges with dueDate in the past
  const result = await prisma.financeCharge.updateMany({
    where: {
      tenantId: ctx.tenantId,
      status: 'pending',
      dueDate: { lt: today },
    },
    data: {
      status: 'overdue',
    },
  });

  // Also update invoices to overdue
  const updatedInvoices = await prisma.financeInvoice.updateMany({
    where: {
      tenantId: ctx.tenantId,
      status: { in: ['issued', 'sent'] },
      dueDate: { lt: today },
    },
    data: {
      status: 'overdue',
    },
  });

  return { updated: result.count + updatedInvoices.count };
}

/**
 * Get students with overdue charges
 */
export async function getDelinquentStudents(): Promise<DelinquentStudent[]> {
  const ctx = await getTenantIdFromSession();

  const overdueCharges = await prisma.financeCharge.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: 'overdue',
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          studentCode: true,
          enrollments: {
            where: { status: { in: ['enrolled', 'reenrolled'] } },
            select: {
              section: { select: { gradeLevel: { select: { name: true } } } },
            },
            take: 1,
          },
        },
      },
      concept: { select: { name: true } },
    },
    orderBy: { dueDate: 'asc' },
  });

  // Group by student
  const byStudent = new Map<string, DelinquentStudent>();

  for (const charge of overdueCharges) {
    const studentId = charge.studentId;
    const daysOverdue = charge.dueDate
      ? Math.floor((Date.now() - charge.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    if (!byStudent.has(studentId)) {
      const gradeLevel =
        charge.student.enrollments[0]?.section.gradeLevel.name || null;
      byStudent.set(studentId, {
        studentId,
        studentName: `${charge.student.lastName} ${charge.student.firstName}`,
        studentCode: charge.student.studentCode,
        gradeLevel,
        totalOverdueCents: 0,
        oldestDueDate: charge.dueDate,
        daysOverdue: daysOverdue,
        charges: [],
      });
    }

    const student = byStudent.get(studentId)!;
    student.totalOverdueCents += charge.amountCents;
    student.charges.push({
      id: charge.id,
      conceptName: charge.concept.name,
      amountCents: charge.amountCents,
      dueDate: charge.dueDate,
      daysOverdue,
    });

    if (charge.dueDate && student.oldestDueDate && charge.dueDate < student.oldestDueDate) {
      student.oldestDueDate = charge.dueDate;
      student.daysOverdue = daysOverdue;
    }
  }

  // Sort by days overdue desc
  return Array.from(byStudent.values()).sort((a, b) => b.daysOverdue - a.daysOverdue);
}

/**
 * Get delinquency summary statistics
 */
export async function getDelinquencySummary(): Promise<DelinquencySummary> {
  const ctx = await getTenantIdFromSession();

  const overdueCharges = await prisma.financeCharge.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: 'overdue',
    },
    select: {
      id: true,
      amountCents: true,
      dueDate: true,
      studentId: true,
    },
  });

  const studentsAffected = new Set(overdueCharges.map((c) => c.studentId)).size;
  const totalOverdueCents = overdueCharges.reduce((sum, c) => sum + c.amountCents, 0);

  const byDaysOverdue: DelinquencySummary['byDaysOverdue'] = {
    '1-7': { count: 0, total: 0 },
    '8-15': { count: 0, total: 0 },
    '16-30': { count: 0, total: 0 },
    '31-60': { count: 0, total: 0 },
    '60+': { count: 0, total: 0 },
  };

  for (const charge of overdueCharges) {
    const days = charge.dueDate
      ? Math.floor((Date.now() - charge.dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    let bucket: keyof typeof byDaysOverdue;
    if (days <= 7) bucket = '1-7';
    else if (days <= 15) bucket = '8-15';
    else if (days <= 30) bucket = '16-30';
    else if (days <= 60) bucket = '31-60';
    else bucket = '60+';

    byDaysOverdue[bucket].count++;
    byDaysOverdue[bucket].total += charge.amountCents;
  }

  return {
    totalOverdueCents,
    overdueCount: overdueCharges.length,
    studentsAffected,
    byDaysOverdue,
  };
}

/**
 * Record a dunning event (call made, email sent, etc.)
 */
export async function recordDunningEvent(
  chargeId: string,
  action: string,
  notes?: string
): Promise<DunningEventRecord> {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.user);

  // Verify charge exists in tenant
  const charge = await prisma.financeCharge.findFirst({
    where: { id: chargeId, tenantId: ctx.tenantId },
  });

  if (!charge) {
    throw new Error('Charge not found');
  }

  const event = await prisma.$transaction(async (tx) => {
    const created = await tx.financeDunningEvent.create({
      data: {
        tenantId: ctx.tenantId,
        chargeId,
        action: action as any,
        performedBy: ctx.actorUserId,
        notes: notes || null,
      },
    });

    await tx.activityEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorUserId: ctx.actorUserId,
        entityType: 'finance',
        entityId: created.id,
        action: 'finance.dunning.recorded',
        metadata: JSON.stringify({
          dunningEventId: created.id,
          chargeId,
          action,
        }),
      },
    });

    return created;
  });

  // Get performer name
  const performer = await prisma.user.findUnique({
    where: { id: ctx.actorUserId },
    select: { fullName: true },
  });

  return {
    id: event.id,
    chargeId: event.chargeId,
    action: event.action,
    performedAt: event.performedAt,
    performedByName: performer?.fullName || ctx.actorUserId,
    notes: event.notes,
  };
}

/**
 * Get dunning history for a charge
 */
export async function getDunningHistory(chargeId: string): Promise<DunningEventRecord[]> {
  const ctx = await getTenantIdFromSession();

  const events = await prisma.financeDunningEvent.findMany({
    where: { chargeId, tenantId: ctx.tenantId },
    orderBy: { performedAt: 'desc' },
  });

  // Get all performer names in one query
  const performerIds = [...new Set(events.map((e) => e.performedBy))];
  const performers = await prisma.user.findMany({
    where: { id: { in: performerIds } },
    select: { id: true, fullName: true },
  });
  const performerMap = new Map(performers.map((p) => [p.id, p.fullName]));

  return events.map((e) => ({
    id: e.id,
    chargeId: e.chargeId,
    action: e.action,
    performedAt: e.performedAt,
    performedByName: performerMap.get(e.performedBy) || e.performedBy,
    notes: e.notes,
  }));
}

/**
 * Schedule a reminder for a charge
 */
export async function scheduleReminder(
  chargeId: string,
  type: string,
  channel: string,
  scheduledFor: Date
): Promise<{ id: string }> {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.user);

  const reminder = await prisma.financeReminder.create({
    data: {
      tenantId: ctx.tenantId,
      chargeId,
      type: type as any,
      channel: channel as any,
      scheduledFor,
      status: 'pending',
    },
  });

  return { id: reminder.id };
}

/**
 * Get pending reminders
 */
export async function getPendingReminders(): Promise<
  Array<{
    id: string;
    chargeId: string;
    type: string;
    channel: string;
    scheduledFor: Date;
  }>
> {
  const ctx = await getTenantIdFromSession();

  const reminders = await prisma.financeReminder.findMany({
    where: {
      tenantId: ctx.tenantId,
      status: 'pending',
      scheduledFor: { lte: new Date() },
    },
    select: {
      id: true,
      chargeId: true,
      type: true,
      channel: true,
      scheduledFor: true,
    },
    orderBy: { scheduledFor: 'asc' },
    take: 100,
  });

  return reminders.map((r) => ({
    id: r.id,
    chargeId: r.chargeId,
    type: r.type,
    channel: r.channel,
    scheduledFor: r.scheduledFor,
  }));
}

/**
 * Mark reminder as sent
 */
export async function markReminderSent(reminderId: string, externalId?: string): Promise<void> {
  await prisma.financeReminder.update({
    where: { id: reminderId },
    data: {
      status: 'sent',
      sentAt: new Date(),
      externalId: externalId || null,
    },
  });
}

/**
 * Mark reminder as failed
 */
export async function markReminderFailed(reminderId: string, errorMessage: string): Promise<void> {
  await prisma.financeReminder.update({
    where: { id: reminderId },
    data: {
      status: 'failed',
      errorMessage,
    },
  });
}

/**
 * Manual reminder pipeline (no email/SMS provider is configured in this project,
 * so delivery is limited to the in_app channel):
 * 1. Ensure every currently overdue charge has an on_due_date reminder scheduled.
 * 2. "Deliver" (mark sent) every pending reminder that is due.
 * Returns counts so the UI can show what happened.
 */
export async function processOverdueReminders(): Promise<{ scheduled: number; sent: number }> {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.user);

  const overdueCharges = await prisma.financeCharge.findMany({
    where: { tenantId: ctx.tenantId, status: 'overdue' },
    select: { id: true },
  });

  let scheduled = 0;
  for (const charge of overdueCharges) {
    const existing = await prisma.financeReminder.findFirst({
      where: { tenantId: ctx.tenantId, chargeId: charge.id, type: 'on_due_date' },
    });
    if (existing) continue;

    await prisma.financeReminder.create({
      data: {
        tenantId: ctx.tenantId,
        chargeId: charge.id,
        type: 'on_due_date',
        channel: 'in_app',
        scheduledFor: new Date(),
        status: 'pending',
      },
    });
    scheduled++;
  }

  const due = await prisma.financeReminder.findMany({
    where: { tenantId: ctx.tenantId, status: 'pending', channel: 'in_app', scheduledFor: { lte: new Date() } },
    select: { id: true },
    take: 200,
  });

  for (const reminder of due) {
    await prisma.financeReminder.update({
      where: { id: reminder.id },
      data: { status: 'sent', sentAt: new Date() },
    });
  }

  return { scheduled, sent: due.length };
}
