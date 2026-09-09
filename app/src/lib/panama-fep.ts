// ============================================================================
// Panama SFEP (Sistema de Facturación Electrónica de Panamá)
// Integration module for electronic invoicing compliance
// ============================================================================

import prisma from '@/lib/prisma';

// ============================================================================
// Types
// ============================================================================

export type PanamaTenantConfig = {
  ruc: string;
  dv: string;
  nit?: string;
  pacApiKey: string;
  pacProvider: 'alegra' | 'other';
};

export type PanamaInvoicePayload = {
  // Emisor (School)
  emisorRUC: string;
  emisorDV: string;
  emisorNIT?: string;
  emisorNombre: string;
  emisorDireccion?: string;
  emisorTelefono?: string;
  emisorEmail?: string;

  // Receptor (Parent/Guardian)
  receptorRUC?: string;
  receptorDV?: string;
  receptorNombre: string;
  receptorDireccion?: string;
  receptorTelefono?: string;
  receptorEmail?: string;

  // Invoice details
  numeroFactura: string;
  fechaEmision: string; // ISO date
  fechaVencimiento?: string;

  // Items
  Items: Array<{
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    montoTotal: number;
    itbms?: number; // 7% tax
  }>;

  // Totals
  subtotal: number;
  itbmsTotal: number;
  montoTotal: number;

  // Metadata
  tipoDocumento: '01' | '02' | '03'; // Factura, Nota de crédito, etc.
  naturalezaOperacion: string;
};

export type PanamaCUFEResponse = {
  cufe: string;
  xmlPayload: string;
  qrCode?: string;
  pacSignature: string;
  timestamp: string;
};

// ============================================================================
// CUFE Generator
// CUFE = Código Único de Factura Electrónica
// Based on DGI specs: SHA-256 hash of concatenated fields
// ============================================================================

export function generateCUFE(
  numeroFactura: string,
  fechaEmision: string,
  montoTotal: number,
  emisorRUC: string,
  receptorRUC: string | undefined,
  claveSeguridad: string = ''
): string {
  // CUFE format per DGI specs
  // This is a placeholder - actual implementation needs DGI technical specs
  const payload = [
    numeroFactura,
    fechaEmision,
    montoTotal.toFixed(2),
    emisorRUC,
    receptorRUC || '0000000000000',
    claveSeguridad,
  ].join('|');

  // In production: use crypto.subtle.digest('SHA-256', payload)
  // For now, return a format placeholder
  const hash = Buffer.from(payload).toString('base64').slice(0, 64);
  return hash.toUpperCase();
}

// ============================================================================
// XML Generator (DGI Format)
// ============================================================================

export function generateDGIInvoiceXML(payload: PanamaInvoicePayload): string {
  const items = payload.Items.map((item, idx) => `
    <Item>
      <NumeroLinea>${idx + 1}</NumeroLinea>
      <Descripcion>${escapeXML(item.descripcion)}</Descripcion>
      <Cantidad>${item.cantidad}</Cantidad>
      <PrecioUnitario>${item.precioUnitario.toFixed(2)}</PrecioUnitario>
      <MontoTotal>${item.montoTotal.toFixed(2)}</MontoTotal>
      ${item.itbms ? `<ITBMS>${item.itbms.toFixed(2)}</ITBMS>` : ''}
    </Item>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<FacturaElectronica xmlns="http://dgi-fep.mef.gob.pa/schema">
  <Encabezado>
    <TipoDocumento>${payload.tipoDocumento}</TipoDocumento>
    <NaturalezaOperacion>${escapeXML(payload.naturalezaOperacion)}</NaturalezaOperacion>
    <NumeroFactura>${escapeXML(payload.numeroFactura)}</NumeroFactura>
    <FechaEmision>${payload.fechaEmision}</FechaEmision>
    ${payload.fechaVencimiento ? `<FechaVencimiento>${payload.fechaVencimiento}</FechaVencimiento>` : ''}
  </Encabezado>
  
  <Emisor>
    <RUC>${payload.emisorRUC}</RUC>
    <DV>${payload.emisorDV}</DV>
    ${payload.emisorNIT ? `<NIT>${payload.emisorNIT}</NIT>` : ''}
    <RazonSocial>${escapeXML(payload.emisorNombre)}</RazonSocial>
    ${payload.emisorDireccion ? `<Direccion>${escapeXML(payload.emisorDireccion)}</Direccion>` : ''}
    ${payload.emisorTelefono ? `<Telefono>${payload.emisorTelefono}</Telefono>` : ''}
    ${payload.emisorEmail ? `<Correo>${payload.emisorEmail}</Correo>` : ''}
  </Emisor>
  
  <Receptor>
    ${payload.receptorRUC ? `<RUC>${payload.receptorRUC}</RUC>` : ''}
    ${payload.receptorDV ? `<DV>${payload.receptorDV}</DV>` : ''}
    <RazonSocial>${escapeXML(payload.receptorNombre)}</RazonSocial>
    ${payload.receptorDireccion ? `<Direccion>${escapeXML(payload.receptorDireccion)}</Direccion>` : ''}
    ${payload.receptorTelefono ? `<Telefono>${payload.receptorTelefono}</Telefono>` : ''}
    ${payload.receptorEmail ? `<Correo>${payload.receptorEmail}</Correo>` : ''}
  </Receptor>
  
  <Detalle>
    ${items}
  </Detalle>
  
  <Resumen>
    <SubTotal>${payload.subtotal.toFixed(2)}</SubTotal>
    <ITBMSTotal>${payload.itbmsTotal.toFixed(2)}</ITBMSTotal>
    <MontoTotal>${payload.montoTotal.toFixed(2)}</MontoTotal>
  </Resumen>
</FacturaElectronica>`;
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============================================================================
// PAC Client (Provider Abstraction)
// ============================================================================

export type PACProvider = {
  name: string;
  sendInvoice: (xml: string, apiKey: string) => Promise<PanamaCUFEResponse>;
  getInvoiceStatus: (cufe: string, apiKey: string) => Promise<'accepted' | 'rejected' | 'pending'>;
};

// Alegra PAC integration (placeholder - requires actual API specs)
export const AlegraPAC: PACProvider = {
  name: 'alegra',
  
  async sendInvoice(xml: string, apiKey: string): Promise<PanamaCUFEResponse> {
    // TODO: Implement actual Alegra API call
    // Documentation: https://developer.alegra.com/docs
    
    const response = await fetch('https://api.alegra.com/api/v1/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        xml,
        // Additional Alegra-specific fields
      }),
    });

    if (!response.ok) {
      throw new Error(`PAC error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      cufe: data.cufe || generateCUFE('placeholder', new Date().toISOString(), 0, '0', '0'),
      xmlPayload: xml,
      pacSignature: data.signature || 'pending',
      timestamp: new Date().toISOString(),
    };
  },

  async getInvoiceStatus(cufe: string, apiKey: string): Promise<'accepted' | 'rejected' | 'pending'> {
    // TODO: Implement status check
    return 'pending';
  },
};

// Available PAC providers
export const PAC_PROVIDERS: Record<string, PACProvider> = {
  alegra: AlegraPAC,
  // Add more providers as needed
};

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get Panama configuration for a tenant
 */
export async function getPanamaConfig(tenantId: string): Promise<PanamaTenantConfig | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      panamaRUC: true,
      panamaDV: true,
      panamaNIT: true,
      panamaPACApiKey: true,
    },
  });

  if (!tenant?.panamaRUC || !tenant?.panamaDV || !tenant?.panamaPACApiKey) {
    return null;
  }

  return {
    ruc: tenant.panamaRUC,
    dv: tenant.panamaDV,
    nit: tenant.panamaNIT || undefined,
    pacApiKey: tenant.panamaPACApiKey,
    pacProvider: 'alegra',
  };
}

/**
 * Check if tenant is configured for Panama electronic invoicing
 */
export async function isPanamaInvoicingEnabled(tenantId: string): Promise<boolean> {
  const config = await getPanamaConfig(tenantId);
  return config !== null;
}

/**
 * Send invoice to PAC for electronic certification
 */
export async function sendInvoiceToPAC(
  tenantId: string,
  invoicePayload: PanamaInvoicePayload
): Promise<PanamaCUFEResponse> {
  const config = await getPanamaConfig(tenantId);
  
  if (!config) {
    throw new Error('Panama invoicing not configured for this tenant');
  }

  const provider = PAC_PROVIDERS[config.pacProvider];
  if (!provider) {
    throw new Error(`Unknown PAC provider: ${config.pacProvider}`);
  }

  // Generate XML
  const xml = generateDGIInvoiceXML(invoicePayload);

  // Send to PAC
  const result = await provider.sendInvoice(xml, config.pacApiKey);

  return result;
}
