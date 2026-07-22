'use client';

import { Button, Spin, App, Tag } from 'antd';
import { useState } from 'react';

type ChargeItem = {
  id: string;
  conceptName: string;
  periodKey: string | null;
  status: string;
  amountCents: number;
  currency: string;
  dueDate: Date | null;
};

type Props = {
  charges: ChargeItem[];
};

function formatCents(cents: number, currency = 'USD'): string {
  return `$${(cents / 100).toLocaleString('es-PY', { minimumFractionDigits: 2 })}`;
}

function formatDate(d: Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('es-PY');
}

export default function ChargesWithInvoice({ charges }: Props) {
  const { message } = App.useApp();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [invoiceIds, setInvoiceIds] = useState<Record<string, string>>({});

  const handleDownload = async (chargeId: string) => {
    setLoadingId(chargeId);
    try {
      // Check if we already have the invoice ID
      if (invoiceIds[chargeId]) {
        window.open(`/api/invoices/${invoiceIds[chargeId]}/pdf`, '_blank');
        return;
      }

      // Try to create/get invoice
      const res = await fetch('/api/invoices/from-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chargeId }),
      });

      if (!res.ok) {
        throw new Error('Error');
      }

      const data = await res.json();
      setInvoiceIds((prev) => ({ ...prev, [chargeId]: data.id }));
      window.open(`/api/invoices/${data.id}/pdf`, '_blank');
    } catch (err: any) {
      message.error(err.message || 'Error generando factura');
    } finally {
      setLoadingId(null);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'gold',
    paid: 'green',
    overdue: 'red',
    void: 'default',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    paid: 'Pagado',
    overdue: 'Vencido',
    void: 'Anulado',
  };

  if (charges.length === 0) {
    return <p className="text-sm text-gray-500">Sin cargos.</p>;
  }

  return (
    <div className="space-y-2">
      {charges.map((c) => (
        <div
          key={c.id}
          className="flex items-start justify-between gap-4 p-3 rounded-xl bg-gray-50"
        >
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">
              {c.conceptName ?? c.periodKey ?? 'Cargo'}
            </div>
            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
              {c.periodKey && <span>Periodo: {c.periodKey}</span>}
              {c.dueDate && <span>· Vence: {formatDate(c.dueDate)}</span>}
            </div>
            <div className="mt-1">
              <Tag color={statusColors[c.status] || 'default'}>
                {statusLabels[c.status] || c.status}
              </Tag>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">
              {formatCents(c.amountCents, c.currency)}
            </div>
            {c.status !== 'void' && (
              <Button
                size="small"
                loading={loadingId === c.id}
                onClick={() => handleDownload(c.id)}
              >
                Factura PDF
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
