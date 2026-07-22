import React from 'react';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer';

// ============================================================================
// Types
// ============================================================================

export type InvoicePDFData = {
  folio: string;
  issuedAt: Date;
  dueDate: Date;
  status: string;

  // Emisor (escuela)
  schoolName: string;
  schoolRUC?: string;
  schoolAddress?: string;
  schoolPhone?: string;
  schoolEmail?: string;

  // Receptor (padre/tutor)
  recipientName?: string;
  recipientRUC?: string;
  recipientEmail?: string;
  recipientPhone?: string;

  // Alumno
  studentName: string;
  studentCode?: string;
  gradeLevel?: string;
  sectionName?: string;

  // Concepto
  conceptName: string;
  periodKey?: string;

  // Montos
  amountCents: number;
  currency: string;
  itbmsCents?: number; // Impuesto Panama

  // Panama fiscal
  panamaCUFE?: string;
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    padding: 40,
    lineHeight: 1.4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    borderBottom: '1 solid #e5e7eb',
    paddingBottom: 20,
  },
  schoolInfo: {
    maxWidth: '55%',
  },
  schoolName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  schoolDetail: {
    fontSize: 9,
    color: '#6b7280',
  },
  invoiceInfo: {
    maxWidth: '40%',
    alignItems: 'flex-end',
  },
  invoiceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  invoiceFolio: {
    fontSize: 11,
    color: '#374151',
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 9,
    color: '#6b7280',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    color: '#6b7280',
    fontSize: 9,
  },
  value: {
    color: '#1f2937',
    fontWeight: 'medium',
  },
  divider: {
    borderBottom: '1 solid #e5e7eb',
    marginVertical: 10,
  },
  itemsTable: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#374151',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottom: '1 solid #f3f4f6',
  },
  tableCell: {
    fontSize: 10,
    color: '#4b5563',
  },
  colConcept: {
    width: '60%',
  },
  colQty: {
    width: '10%',
    textAlign: 'center',
  },
  colPrice: {
    width: '15%',
    textAlign: 'right',
  },
  colTotal: {
    width: '15%',
    textAlign: 'right',
  },
  totals: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 10,
    color: '#6b7280',
  },
  totalValue: {
    fontSize: 10,
    fontWeight: 'medium',
    color: '#1f2937',
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1 solid #d1d5db',
  },
  grandTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  grandTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  statusBox: {
    marginTop: 20,
    padding: 10,
    backgroundColor: '#f0fdf4',
    borderRadius: 4,
    borderLeft: '4 solid #22c55e',
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#15803d',
  },
  statusOverdue: {
    backgroundColor: '#fef2f2',
    borderLeftColor: '#ef4444',
  },
  statusOverdueText: {
    color: '#dc2626',
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    borderTop: '1 solid #e5e7eb',
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: '#9ca3af',
    textAlign: 'center',
  },
  paymentInfo: {
    marginTop: 20,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    border: '1 solid #e2e8f0',
  },
  paymentTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  paymentDetail: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  cufeBox: {
    marginTop: 15,
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  cufeLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
  },
  cufeValue: {
    fontSize: 7,
    fontFamily: 'Courier',
    color: '#4b5563',
    wordBreak: 'break-all',
  },
});

// ============================================================================
// Helper functions
// ============================================================================

function formatCurrency(cents: number, currency: string): string {
  const amount = cents / 100;
  const symbol = currency === 'USD' ? '$' : currency === 'MXN' ? '$' : currency;
  return `${symbol}${amount.toLocaleString('es-PY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-PY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    issued: 'Emitida',
    sent: 'Enviada',
    paid: 'Pagada',
    cancelled: 'Cancelada',
    overdue: 'Vencida',
  };
  return labels[status] || status;
}

// ============================================================================
// Component
// ============================================================================

export const InvoicePDF: React.FC<{ data: InvoicePDFData }> = ({ data }) => {
  const subtotal = data.amountCents;
  const itbms = data.itbmsCents || 0;
  const total = subtotal + itbms;

  const isOverdue = data.status === 'overdue';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.schoolInfo}>
            <Text style={styles.schoolName}>{data.schoolName}</Text>
            {data.schoolRUC && (
              <Text style={styles.schoolDetail}>RUC: {data.schoolRUC}</Text>
            )}
            {data.schoolAddress && (
              <Text style={styles.schoolDetail}>{data.schoolAddress}</Text>
            )}
            {data.schoolPhone && (
              <Text style={styles.schoolDetail}>Tel: {data.schoolPhone}</Text>
            )}
            {data.schoolEmail && (
              <Text style={styles.schoolDetail}>{data.schoolEmail}</Text>
            )}
          </View>
          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceTitle}>FACTURA</Text>
            <Text style={styles.invoiceFolio}>{data.folio}</Text>
            <Text style={styles.invoiceDate}>Fecha: {formatDate(data.issuedAt)}</Text>
            <Text style={styles.invoiceDate}>Vence: {formatDate(data.dueDate)}</Text>
          </View>
        </View>

        {/* Recipient info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del Receptor</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{data.recipientName || 'N/A'}</Text>
          </View>
          {data.recipientRUC && (
            <View style={styles.row}>
              <Text style={styles.label}>RUC/Cédula:</Text>
              <Text style={styles.value}>{data.recipientRUC}</Text>
            </View>
          )}
          {data.recipientEmail && (
            <View style={styles.row}>
              <Text style={styles.label}>Email:</Text>
              <Text style={styles.value}>{data.recipientEmail}</Text>
            </View>
          )}
        </View>

        {/* Student info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Datos del Alumno</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Nombre:</Text>
            <Text style={styles.value}>{data.studentName}</Text>
          </View>
          {data.studentCode && (
            <View style={styles.row}>
              <Text style={styles.label}>Matrícula:</Text>
              <Text style={styles.value}>{data.studentCode}</Text>
            </View>
          )}
          {data.gradeLevel && (
            <View style={styles.row}>
              <Text style={styles.label}>Grado:</Text>
              <Text style={styles.value}>
                {data.gradeLevel}
                {data.sectionName ? ` - ${data.sectionName}` : ''}
              </Text>
            </View>
          )}
        </View>

        {/* Items table */}
        <View style={styles.itemsTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.colConcept]}>Concepto</Text>
            <Text style={[styles.tableHeaderCell, styles.colQty]}>Cant.</Text>
            <Text style={[styles.tableHeaderCell, styles.colPrice]}>Precio</Text>
            <Text style={[styles.tableHeaderCell, styles.colTotal]}>Total</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.colConcept]}>
              {data.conceptName}
              {data.periodKey ? ` (${data.periodKey})` : ''}
            </Text>
            <Text style={[styles.tableCell, styles.colQty]}>1</Text>
            <Text style={[styles.tableCell, styles.colPrice]}>
              {formatCurrency(data.amountCents, data.currency)}
            </Text>
            <Text style={[styles.tableCell, styles.colTotal]}>
              {formatCurrency(data.amountCents, data.currency)}
            </Text>
          </View>
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(subtotal, data.currency)}</Text>
          </View>
          {itbms > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>ITBMS (7%):</Text>
              <Text style={styles.totalValue}>{formatCurrency(itbms, data.currency)}</Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text style={styles.grandTotalLabel}>TOTAL:</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(total, data.currency)}</Text>
          </View>
        </View>

        {/* Status */}
        <View style={[styles.statusBox, isOverdue ? styles.statusOverdue : {}]}>
          <Text
            style={[
              styles.statusText,
              isOverdue ? styles.statusOverdueText : {},
            ]}
          >
            Estado: {getStatusLabel(data.status)}
          </Text>
        </View>

        {/* Panama CUFE */}
        {data.panamaCUFE && (
          <View style={styles.cufeBox}>
            <Text style={styles.cufeLabel}>CUFE (Código Único de Factura Electrónica):</Text>
            <Text style={styles.cufeValue}>{data.panamaCUFE}</Text>
          </View>
        )}

        {/* Payment info */}
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentTitle}>Información de Pago</Text>
          <Text style={styles.paymentDetail}>
            Realice su depósito o transferencia indicando el número de factura: {data.folio}
          </Text>
          <Text style={styles.paymentDetail}>
            Alumno: {data.studentName} ({data.studentCode || 'N/A'})
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Este documento es válido como comprobante de cargo. Para facturas fiscales de Panamá,
            verifique el CUFE en https://dgi-fep.mef.gob.pa/Consultas/FacturasporCUFE
          </Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoicePDF;
