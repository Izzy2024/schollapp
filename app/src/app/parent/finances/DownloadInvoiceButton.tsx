'use client';

import { Button, Spin, App } from 'antd';
import { useState, useEffect } from 'react';

type Props = {
  chargeId: string;
};

export default function DownloadInvoiceButton({ chargeId }: Props) {
  const { message } = App.useApp();
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/invoices/from-charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chargeId }),
      });
      
      if (!res.ok) {
        throw new Error('Error generando factura');
      }
      
      const data = await res.json();
      setInvoiceId(data.id);
      
      // Open PDF
      window.open(`/api/invoices/${data.id}/pdf`, '_blank');
    } catch (err: any) {
      message.error(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (invoiceId) {
      window.open(`/api/invoices/${invoiceId}/pdf`, '_blank');
    } else {
      handleCreate();
    }
  };

  return (
    <Button
      size="small"
      loading={loading}
      onClick={handleDownload}
      icon={<span className="material-symbols-outlined text-sm">download</span>}
    >
      {invoiceId ? 'Factura' : 'Generar factura'}
    </Button>
  );
}
