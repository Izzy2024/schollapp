'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, InputNumber, Select, Table, message } from 'antd';
import * as financeConcept from '@/actions/finance/concepts';
import { formatErrorForMessage, getStableErrorCode } from './stableErrorUi';

type Concept = Awaited<ReturnType<typeof financeConcept.list>>[number];

export default function ConceptsTab() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [concepts, setConcepts] = useState<Concept[]>([]);

  const load = async () => {
    setTableLoading(true);
    try {
      const rows = await financeConcept.list();
      setConcepts(rows);
    } catch (err) {
      message.error(formatErrorForMessage(err));
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo(
    () => [
      { title: 'Nombre', dataIndex: 'name', key: 'name' },
      {
        title: 'Tipo',
        dataIndex: 'kind',
        key: 'kind',
        render: (v: string) => (v === 'monthly' ? 'Mensual' : 'Único'),
      },
      {
        title: 'Monto',
        key: 'amount',
        render: (_: any, r: Concept) => `${(r.amountCents / 100).toFixed(2)} ${r.currency}`,
      },
      {
        title: 'Activo',
        dataIndex: 'isActive',
        key: 'isActive',
        render: (v: boolean) => (v ? 'Sí' : 'No'),
      },
    ],
    []
  );

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await financeConcept.create({
        name: values.name,
        kind: values.kind,
        amountCents: Math.round(Number(values.amount) * 100),
        currency: values.currency,
      });
      message.success('Concepto creado');
      form.resetFields(['name']);
      await load();
    } catch (err) {
      // Must-have: show stable error code if present
      const code = getStableErrorCode(err);
      if (code) message.error(code);
      else message.error(formatErrorForMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ kind: 'monthly', currency: 'MXN' }}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Form.Item name="name" label="Nombre" rules={[{ required: true, message: 'Ingresa el nombre' }]}>
              <Input placeholder="Colegiatura" />
            </Form.Item>

            <Form.Item name="kind" label="Tipo" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'monthly', label: 'Mensual' },
                  { value: 'one_time', label: 'Único' },
                ]}
              />
            </Form.Item>

            <Form.Item name="amount" label="Monto" rules={[{ required: true, message: 'Ingresa el monto' }]}>
              <InputNumber className="w-full" min={0} step={0.01} placeholder="1200.00" />
            </Form.Item>

            <Form.Item name="currency" label="Moneda" rules={[{ required: true }]}>
              <Select options={[{ value: 'MXN', label: 'MXN' }, { value: 'USD', label: 'USD' }]} />
            </Form.Item>
          </div>

          <div className="flex gap-2">
            <Button type="primary" htmlType="submit" loading={loading}>
              Crear concepto
            </Button>
            <Button onClick={load} disabled={tableLoading}>
              Refrescar
            </Button>
          </div>
        </Form>
      </div>

      <Table
        rowKey="id"
        loading={tableLoading}
        dataSource={concepts}
        columns={columns as any}
        pagination={{ pageSize: 10 }}
      />
    </div>
  );
}
