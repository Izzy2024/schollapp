'use server';

import { renderToStream } from '@react-pdf/renderer';
import prisma from '@/lib/prisma';
import { getTenantIdFromSession } from '../finance/_shared';
import InvoicePDF, { type InvoicePDFData } from '@/lib/pdf/invoice-template';

/**
 * Generate PDF for an invoice
 * Returns the PDF as a buffer that can be served to the user
 */
export async function generateInvoicePdf(invoiceId: string): Promise<Buffer> {
  const ctx = await getTenantIdFromSession();

  // Get invoice data
  const invoice = await prisma.financeInvoice.findFirst({
    where: { id: invoiceId, tenantId: ctx.tenantId },
    include: {
      charge: {
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
              studentCode: true,
              enrollments: {
                where: { status: { in: ['enrolled', 'reenrolled'] } },
                select: {
                  section: {
                    select: {
                      name: true,
                      gradeLevel: { select: { name: true } },
                    },
                  },
                },
                take: 1,
              },
            },
          },
          concept: { select: { name: true } },
        },
      },
    },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  // Get tenant info
  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: {
      name: true,
      panamaRUC: true,
      slug: true,
    },
  });

  const student = invoice.charge.student;
  const enrollment = student.enrollments[0];
  const section = enrollment?.section;

  // Build PDF data
  const pdfData: InvoicePDFData = {
    folio: invoice.folio,
    issuedAt: invoice.issuedAt,
    dueDate: invoice.dueDate,
    status: invoice.status,

    schoolName: tenant?.name || 'Escuela',
    schoolRUC: tenant?.panamaRUC || undefined,

    recipientName: invoice.recipientName || undefined,
    recipientRUC: invoice.recipientRUC || undefined,
    recipientEmail: invoice.recipientEmail || undefined,
    recipientPhone: invoice.recipientPhone || undefined,

    studentName: `${student.lastName} ${student.firstName}`,
    studentCode: student.studentCode || undefined,
    gradeLevel: section?.gradeLevel.name || undefined,
    sectionName: section?.name || undefined,

    conceptName: invoice.conceptName,
    periodKey: invoice.charge.periodKey || undefined,

    amountCents: invoice.amountCents,
    currency: invoice.currency,

    panamaCUFE: invoice.panamaCUFE || undefined,
  };

  // Generate PDF
  const stream = await renderToStream(<InvoicePDF data={pdfData} />);

  // Convert stream to buffer
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    if (typeof chunk === 'string') {
      chunks.push(Buffer.from(chunk));
    } else {
      chunks.push(chunk as Buffer);
    }
  }
  return Buffer.concat(chunks);
}

/**
 * Generate PDF by folio
 */
export async function generateInvoicePdfByFolio(folio: string): Promise<Buffer> {
  const ctx = await getTenantIdFromSession();

  const invoice = await prisma.financeInvoice.findFirst({
    where: { folio, tenantId: ctx.tenantId },
    select: { id: true },
  });

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  return generateInvoicePdf(invoice.id);
}
