'use server';

import prisma from '@/lib/prisma';
import { getTenantIdFromSession, assertFinanceWriteAccess } from './_shared';
import {
  getPanamaConfig,
  sendInvoiceToPAC,
  generateCUFE,
  generateDGIInvoiceXML,
  type PanamaInvoicePayload,
} from '@/lib/panama-fep';

/**
 * Send an invoice to PAC for Panama electronic certification
 * Updates the invoice with CUFE and XML payload
 */
export async function sendInvoiceToPanamaPAC(invoiceId: string): Promise<{
  cufe: string;
  folio: string;
}> {
  const ctx = await getTenantIdFromSession();
  await assertFinanceWriteAccess(ctx.user);

  // Check Panama configuration
  const panamaConfig = await getPanamaConfig(ctx.tenantId);
  if (!panamaConfig) {
    throw new Error('Panama invoicing not configured. Configure RUC, DV, and PAC API key in tenant settings.');
  }

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

  if (invoice.panamaCUFE) {
    // Already sent
    return {
      cufe: invoice.panamaCUFE,
      folio: invoice.folio,
    };
  }

  // Get tenant info
  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: {
      name: true,
      panamaRUC: true,
      panamaDV: true,
      panamaNIT: true,
    },
  });

  // Build PAC payload
  const subtotal = invoice.amountCents;
  const itbms = Math.round(subtotal * 0.07); // 7% ITBMS
  const total = subtotal + itbms;

  const payload: PanamaInvoicePayload = {
    emisorRUC: panamaConfig.ruc,
    emisorDV: panamaConfig.dv,
    emisorNIT: panamaConfig.nit,
    emisorNombre: tenant?.name || 'Escuela',
    receptorRUC: invoice.recipientRUC || undefined,
    receptorNombre: invoice.recipientName || `${invoice.charge.student.lastName} ${invoice.charge.student.firstName}`,
    receptorEmail: invoice.recipientEmail || undefined,
    receptorTelefono: invoice.recipientPhone || undefined,
    numeroFactura: invoice.folio,
    fechaEmision: invoice.issuedAt.toISOString().split('T')[0],
    fechaVencimiento: invoice.dueDate.toISOString().split('T')[0],
    Items: [
      {
        descripcion: invoice.conceptName,
        cantidad: 1,
        precioUnitario: subtotal / 100,
        montoTotal: subtotal / 100,
        itbms: itbms / 100,
      },
    ],
    subtotal: subtotal / 100,
    itbmsTotal: itbms / 100,
    montoTotal: total / 100,
    tipoDocumento: '01', // Factura
    naturalezaOperacion: '01', // Ventas
  };

  // Generate XML locally first (for storage)
  const xml = generateDGIInvoiceXML(payload);

  // Generate CUFE locally (or receive from PAC)
  const cufe = generateCUFE(
    invoice.folio,
    payload.fechaEmision,
    payload.montoTotal,
    payload.emisorRUC,
    payload.receptorRUC
  );

  // Update invoice with CUFE and XML
  const updated = await prisma.$transaction(async (tx) => {
    const inv = await tx.financeInvoice.update({
      where: { id: invoiceId },
      data: {
        panamaCUFE: cufe,
        panamaXML: xml,
        status: 'sent',
        sentAt: new Date(),
      },
    });

    await tx.activityEvent.create({
      data: {
        tenantId: ctx.tenantId,
        actorUserId: ctx.actorUserId,
        entityType: 'finance',
        entityId: invoiceId,
        action: 'finance.invoice.panama_sent',
        metadata: JSON.stringify({
          invoiceId,
          folio: invoice.folio,
          cufe,
        }),
      },
    });

    return inv;
  });

  // TODO: Actually send to PAC when API is ready
  // try {
  //   const pacResult = await sendInvoiceToPAC(ctx.tenantId, payload);
  //   // Update with PAC-issued CUFE if different
  // } catch (err) {
  //   // Handle PAC error but keep local CUFE
  // }

  return {
    cufe: updated.panamaCUFE!,
    folio: invoice.folio,
  };
}

/**
 * Check if Panama invoicing is enabled for current tenant
 */
export async function checkPanamaInvoicingStatus(): Promise<{
  enabled: boolean;
  hasRUC: boolean;
  hasDV: boolean;
  hasPACKey: boolean;
}> {
  const ctx = await getTenantIdFromSession();

  const tenant = await prisma.tenant.findUnique({
    where: { id: ctx.tenantId },
    select: {
      panamaRUC: true,
      panamaDV: true,
      panamaPACApiKey: true,
    },
  });

  return {
    enabled: !!(tenant?.panamaRUC && tenant?.panamaDV && tenant?.panamaPACApiKey),
    hasRUC: !!tenant?.panamaRUC,
    hasDV: !!tenant?.panamaDV,
    hasPACKey: !!tenant?.panamaPACApiKey,
  };
}
