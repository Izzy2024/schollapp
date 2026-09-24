'use client';

import React, { useEffect, useState } from 'react';
import { App, Button, Spin, Tag, Modal, Form, Input, DatePicker, Select, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { listInvoices, generateInvoice, markInvoiceSent, cancelInvoice } from '@/actions/finance/invoices';
import type { InvoiceListItem } from '@/actions/finance-client-types';

const STATUS_COLORS: Record<string, string> = {
  issued: 'blue',
  sent: 'cyan',
  paid: 'green',
  cancelled: 'default',
  overdue: 'red',
};

const STATUS_LABELS: Record<string, string> = {
  issued: 'Emitida',
  sent: 'Enviada',
  paid: 'Pagada',
  cancelled: 'Cancelada',
  overdue: 'Vencida',
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('es-PY', { minimumFractionDigits: 2 })}`;
}

export default function InvoicesTab() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceListItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listInvoices();
      setInvoices(data);
    } catch (err: any) {
      message.error(err.message || 'Error cargando facturas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleGeneratePdf = (invoice: InvoiceListItem) => {
    window.open(`/api/invoices/${invoice.id}/pdf`, '_blank');
  };

  const handleMarkSent = async (invoice: InvoiceListItem) => {
    try {
      await markInvoiceSent(invoice.id);
      message.success('Factura marcada como enviada');
      load();
    } catch (err: any) {
      message.error(err.message || 'Error');
    }
  };

  const handleCancel = async (invoice: InvoiceListItem) => {
    Modal.confirm({
      title: 'Cancelar factura',
      content: `¿Estás seguro de cancelar la factura ${invoice.folio}?`,
      onOk: async () => {
        try {
          await cancelInvoice(invoice.id);
          message.success('Factura cancelada');
          load();
        } catch (err: any) {
          message.error(err.message || 'Error');
        }
      },
    });
  };

  const columns: ColumnsType<InvoiceListItem> = [
    {
      title: 'Folio',
      dataIndex: 'folio',
      key: 'folio',
      render: (folio: string) => <span className="font-mono font-medium">{folio}</span>,
    },
    {
      title: 'Alumno',
      dataIndex: 'studentName',
      key: 'studentName',
      render: (name: string, record) => (
        <div>
          <div className="font-medium">{name}</div>
          {record.studentCode && (
            <div className="text-xs text-gray-400">{record.studentCode}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Concepto',
      dataIndex: 'conceptName',
      key: 'conceptName',
    },
    {
      title: 'Monto',
      dataIndex: 'amountCents',
      key: 'amountCents',
      render: (cents: number, record) => formatCents(cents),
      align: 'right',
    },
    {
      title: 'Vencimiento',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: Date) => new Date(date).toLocaleDateString('es-PY'),
    },
    {
      title: 'Estado',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={STATUS_COLORS[status]}>{STATUS_LABELS[status] || status}</Tag>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      render: (_: any, record: InvoiceListItem) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => handleGeneratePdf(record)}>
            PDF
          </Button>
          {record.status === 'issued' && (
            <Button size="small" onClick={() => handleMarkSent(record)}>
              Marcar enviado
            </Button>
          )}
          {record.status !== 'cancelled' && record.status !== 'paid' && (
            <Button size="small" danger onClick={() => handleCancel(record)}>
              Cancelar
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">Facturas generadas para los cargos</p>
        <Button onClick={load}>Actualizar</Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <Spin />
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No hay facturas generadas. Genera facturas desde la sección de Cargos.
        </div>
      ) : (
        <Table
          dataSource={invoices}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      )}
    </div>
  );
}
