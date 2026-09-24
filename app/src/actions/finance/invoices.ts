'use server';

import prisma from '@/lib/prisma';
import { STABLE_ERROR, stableError } from '@/lib/errors';
import { assertFinanceWriteAccess, getTenantIdFromSession } from './_shared';

// ============================================================================
// Types
// ============================================================================

export type InvoiceListItem = {
  id: string;
  folio: string;
  studentId: string;
  studentName: string;
  studentCode: string | null;
  conceptName: string;
  amountCents: number;
  currency: string;
  status: string;
  issuedAt: Date;
  dueDate: Date;
  paidAt: Date | null;
  sentAt: Date | null;
  panamaCUFE: string | null;
};

export type InvoiceDetail = InvoiceListItem & {
  recipientName: string | null;
  recipientRUC: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  panamaXML: string | null;
  chargeId: string;
  conceptId: string;
};

export type GenerateInvoiceInput = {
  chargeId: string;
  dueDate?: Date;
  recipientName?: string;
  recipientRUC?: string;
  recipientEmail?: string;
  recipientPhone?: string;
};

// ============================================================================
// Helpers
// ============================================================================

async function generateNextFolio(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const lastInvoice = await prisma.financeInvoice.findFirst({
    where: { tenantId, folio: { startsWith: `INV-${year}-` } },
    orderBy: { folio: 'desc' },
    select: { folio: true },
  });

  let nextNumber = 1;
  if (lastInvoice?.folio) {
    const parts = lastInvoice.folio.split('-');
    const lastNumber = parseInt(parts[2] || '0', 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `INV-${year}-${String(nextNumber).padStart(5, '0')}`;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Generate a formal invoice for a charge
 */
export async function generateInvoice(input: GenerateInvoiceInput): Promise<InvoiceDetail> {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.tenantId, ctx.actorUserId);

  const charge = await prisma.financeCharge.findFirst({
    where: { id: input.chargeId, tenantId: ctx.tenantId },
    include: {
      student: { select: { id: true, firstName: true, lastName: true, studentCode: true } },
      concept: { select: { id: true, name: true } },
    },
  });

  if (!charge) {
    throw stableError(STABLE_ERROR.FINANCE_CHARGE_NOT_FOUND);
  }
  if (charge.status === 'void') {
    throw new Error('Este cargo está anulado; no se puede facturar.');
  }

  // Check if invoice already exists
  const existingInvoice = await prisma.financeInvoice.findFirst({
    where: { chargeId: charge.id, tenantId: ctx.tenantId },
  });

  if (existingInvoice) {
    // Return existing invoice
    return {
      id: existingInvoice.id,
      folio: existingInvoice.folio,
      studentId: charge.studentId,
      studentName: existingInvoice.studentName,
      studentCode: existingInvoice.studentCode,
      conceptName: existingInvoice.conceptName,
      amountCents: existingInvoice.amountCents,
      currency: existingInvoice.currency,
      status: existingInvoice.status,
      issuedAt: existingInvoice.issuedAt,
      dueDate: existingInvoice.dueDate,
      paidAt: existingInvoice.paidAt,
      sentAt: existingInvoice.sentAt,
      panamaCUFE: existingInvoice.panamaCUFE,
      recipientName: existingInvoice.recipientName,
      recipientRUC: existingInvoice.recipientRUC,
      recipientEmail: existingInvoice.recipientEmail,
      recipientPhone: existingInvoice.recipientPhone,
      panamaXML: existingInvoice.panamaXML,
      chargeId: charge.id,
      conceptId: charge.conceptId,
    };
  }

  const folio = await generateNextFolio(ctx.tenantId);
  const dueDate = input.dueDate || charge.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const invoice = await prisma.$transaction(async (tx) => {
    const created = await tx.financeInvoice.create({
      data: {
        tenantId: ctx.tenantId,
        chargeId: charge.id,
        folio,
        studentName: `${charge.student.lastName} ${charge.student.firstName}`,
        studentCode: charge.student.studentCode,
        conceptName: charge.concept.name,
        amountCents: charge.amountCents,
        currency: charge.currency,
        dueDate,
        status: 'issued',
        recipientName: input.recipientName || null,
        recipientRUC: input.recipientRUC || null,
        recipientEmail: input.recipientEmail || null,
        recipientPhone: input.recipientPhone || null,
      },
    });

    await tx.activityEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorUserId: ctx.actorUserId,
        entityType: 'finance',
        entityId: created.id,
        action: 'finance.invoice.generated',
        metadata: JSON.stringify({
          invoiceId: created.id,
          folio: created.folio,
          chargeId: charge.id,
          amountCents: created.amountCents,
        }),
      },
    });

    return created;
  });

  return {
    id: invoice.id,
    folio: invoice.folio,
    studentId: charge.studentId,
    studentName: invoice.studentName,
    studentCode: invoice.studentCode,
    conceptName: invoice.conceptName,
    amountCents: invoice.amountCents,
    currency: invoice.currency,
    status: invoice.status,
    issuedAt: invoice.issuedAt,
    dueDate: invoice.dueDate,
    paidAt: invoice.paidAt,
    sentAt: invoice.sentAt,
    panamaCUFE: invoice.panamaCUFE,
    recipientName: invoice.recipientName,
    recipientRUC: invoice.recipientRUC,
    recipientEmail: invoice.recipientEmail,
    recipientPhone: invoice.recipientPhone,
    panamaXML: invoice.panamaXML,
    chargeId: charge.id,
    conceptId: charge.conceptId,
  };
}

/**
 * List invoices with filters
 */
export async function listInvoices(input?: {
  status?: string;
  studentId?: string;
  fromDueDate?: Date;
  toDueDate?: Date;
}): Promise<InvoiceListItem[]> {
  const ctx = await getTenantIdFromSession();

  const invoices = await prisma.financeInvoice.findMany({
    where: {
      tenantId: ctx.tenantId,
      ...(input?.status ? { status: input.status as any } : {}),
      ...(input?.studentId ? { charge: { studentId: input.studentId } } : {}),
      ...(input?.fromDueDate || input?.toDueDate
        ? {
            dueDate: {
              ...(input.fromDueDate ? { gte: input.fromDueDate } : {}),
              ...(input.toDueDate ? { lte: input.toDueDate } : {}),
            },
          }
        : {}),
    },
    include: {
      charge: { select: { studentId: true } },
    },
    orderBy: [{ dueDate: 'desc' }, { folio: 'desc' }],
    take: 200,
  });

  return invoices.map((inv) => ({
    id: inv.id,
    folio: inv.folio,
    studentId: inv.charge.studentId,
    studentName: inv.studentName,
    studentCode: inv.studentCode,
    conceptName: inv.conceptName,
    amountCents: inv.amountCents,
    currency: inv.currency,
    status: inv.status,
    issuedAt: inv.issuedAt,
    dueDate: inv.dueDate,
    paidAt: inv.paidAt,
    sentAt: inv.sentAt,
    panamaCUFE: inv.panamaCUFE,
  }));
}

/**
 * Get invoice by ID
 */
export async function getInvoice(invoiceId: string): Promise<InvoiceDetail | null> {
  const ctx = await getTenantIdFromSession();

  const invoice = await prisma.financeInvoice.findFirst({
    where: { id: invoiceId, tenantId: ctx.tenantId },
    include: {
      charge: { select: { studentId: true, conceptId: true } },
    },
  });

  if (!invoice) return null;

  return {
    id: invoice.id,
    folio: invoice.folio,
    studentId: invoice.charge.studentId,
    studentName: invoice.studentName,
    studentCode: invoice.studentCode,
    conceptName: invoice.conceptName,
    amountCents: invoice.amountCents,
    currency: invoice.currency,
    status: invoice.status,
    issuedAt: invoice.issuedAt,
    dueDate: invoice.dueDate,
    paidAt: invoice.paidAt,
    sentAt: invoice.sentAt,
    panamaCUFE: invoice.panamaCUFE,
    recipientName: invoice.recipientName,
    recipientRUC: invoice.recipientRUC,
    recipientEmail: invoice.recipientEmail,
    recipientPhone: invoice.recipientPhone,
    panamaXML: invoice.panamaXML,
    chargeId: invoice.chargeId,
    conceptId: invoice.charge.conceptId,
  };
}

/**
 * Get invoice by folio
 */
export async function getInvoiceByFolio(folio: string): Promise<InvoiceDetail | null> {
  const ctx = await getTenantIdFromSession();

  const invoice = await prisma.financeInvoice.findFirst({
    where: { folio, tenantId: ctx.tenantId },
    include: {
      charge: { select: { studentId: true, conceptId: true } },
    },
  });

  if (!invoice) return null;

  return {
    id: invoice.id,
    folio: invoice.folio,
    studentId: invoice.charge.studentId,
    studentName: invoice.studentName,
    studentCode: invoice.studentCode,
    conceptName: invoice.conceptName,
    amountCents: invoice.amountCents,
    currency: invoice.currency,
    status: invoice.status,
    issuedAt: invoice.issuedAt,
    dueDate: invoice.dueDate,
    paidAt: invoice.paidAt,
    sentAt: invoice.sentAt,
    panamaCUFE: invoice.panamaCUFE,
    recipientName: invoice.recipientName,
    recipientRUC: invoice.recipientRUC,
    recipientEmail: invoice.recipientEmail,
    recipientPhone: invoice.recipientPhone,
    panamaXML: invoice.panamaXML,
    chargeId: invoice.chargeId,
    conceptId: invoice.charge.conceptId,
  };
}

/**
 * Mark invoice as sent (emailed to guardian)
 */
export async function markInvoiceSent(invoiceId: string): Promise<void> {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.tenantId, ctx.actorUserId);

  await prisma.$transaction(async (tx) => {
    const invoice = await tx.financeInvoice.findFirst({
      where: { id: invoiceId, tenantId: ctx.tenantId },
    });

    if (!invoice) {
      throw stableError(STABLE_ERROR.FINANCE_CHARGE_NOT_FOUND);
    }

    await tx.financeInvoice.update({
      where: { id: invoiceId },
      data: { sentAt: new Date(), status: 'sent' },
    });

    await tx.activityEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorUserId: ctx.actorUserId,
        entityType: 'finance',
        entityId: invoiceId,
        action: 'finance.invoice.sent',
        metadata: JSON.stringify({ invoiceId, folio: invoice.folio }),
      },
    });
  });
}

/**
 * Cancel an invoice
 */
export async function cancelInvoice(invoiceId: string, reason?: string): Promise<void> {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.tenantId, ctx.actorUserId);

  await prisma.$transaction(async (tx) => {
    const invoice = await tx.financeInvoice.findFirst({
      where: { id: invoiceId, tenantId: ctx.tenantId },
    });

    if (!invoice) {
      throw stableError(STABLE_ERROR.FINANCE_CHARGE_NOT_FOUND);
    }

    if (invoice.status === 'paid') {
      throw new Error('Cannot cancel a paid invoice');
    }

    await tx.financeInvoice.update({
      where: { id: invoiceId },
      data: { status: 'cancelled' },
    });

    await tx.activityEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorUserId: ctx.actorUserId,
        entityType: 'finance',
        entityId: invoiceId,
        action: 'finance.invoice.cancelled',
        metadata: JSON.stringify({ invoiceId, folio: invoice.folio, reason }),
      },
    });
  });
}

/**
 * Update invoice status based on charge status (called after payment)
 */
export async function syncInvoiceStatus(chargeId: string): Promise<void> {
  const ctx = await getTenantIdFromSession();

  const charge = await prisma.financeCharge.findFirst({
    where: { id: chargeId, tenantId: ctx.tenantId },
    select: { status: true },
  });

  if (!charge) return;

  const invoice = await prisma.financeInvoice.findFirst({
    where: { chargeId, tenantId: ctx.tenantId },
  });

  if (!invoice) return;

  if (charge.status === 'paid' && invoice.status !== 'paid') {
    await prisma.financeInvoice.update({
      where: { id: invoice.id },
      data: { status: 'paid', paidAt: new Date() },
    });
  }
}
