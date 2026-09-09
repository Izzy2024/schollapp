'use client';

import React, { useEffect, useState } from 'react';
import { App, Button, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { listAll } from '@/actions/finance/payments';

type PaymentRecord = {
  id: string;
  paidAt: Date;
  studentName: string;
  studentCode: string | null;
  conceptName: string;
  methodName: string;
  amountCents: number;
  currency: string;
  note: string | null;
  reference: string | null;
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('es-PY', { minimumFractionDigits: 2 })}`;
}

export default function PaymentsTab() {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [totalCents, setTotalCents] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const data = await listAll();
      setPayments(data.payments);
      setTotalCents(data.totalCents);
    } catch (err: any) {
      message.error(err.message || 'Error cargando pagos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const columns: ColumnsType<PaymentRecord> = [
    {
      title: 'Fecha',
      dataIndex: 'paidAt',
      key: 'paidAt',
      render: (date: Date) => new Date(date).toLocaleDateString('es-PY'),
      width: 100,
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
      title: 'Método',
      dataIndex: 'methodName',
      key: 'methodName',
      render: (method: string) => (
        <Tag color="blue">{method}</Tag>
      ),
    },
    {
      title: 'Monto',
      dataIndex: 'amountCents',
      key: 'amountCents',
      render: (cents: number) => <span className="font-semibold text-green-600">{formatCents(cents)}</span>,
      align: 'right',
    },
    {
      title: 'Referencia',
      dataIndex: 'reference',
      key: 'reference',
      render: (ref: string | null) => ref ? <span className="font-mono text-xs">{ref}</span> : <span className="text-gray-300">—</span>,
    },
    {
      title: 'Nota',
      dataIndex: 'note',
      key: 'note',
      render: (note: string | null) => note ? <span className="text-xs text-gray-500">{note}</span> : null,
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-sm text-gray-500">Historial de pagos registrados</p>
          {totalCents > 0 && (
            <p className="text-lg font-bold text-green-600 mt-1">
              Total: {formatCents(totalCents)}
            </p>
          )}
        </div>
        <Button onClick={load}>Actualizar</Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <Spin />
        </div>
      ) : payments.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No hay pagos registrados
        </div>
      ) : (
        <Table
          dataSource={payments}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 15 }}
          size="small"
        />
      )}
    </div>
  );
}
