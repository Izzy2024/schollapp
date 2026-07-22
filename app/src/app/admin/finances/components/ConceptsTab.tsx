'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { App, Button, Form, Input, InputNumber, Select, Table, Switch, Tag } from 'antd';
import * as financeConcept from '@/actions/finance/concepts';
import { StableErrorUi, toStableErrorDisplay, type StableErrorDisplay } from './stableErrorUi';

type Concept = Awaited<ReturnType<typeof financeConcept.list>>[number];

export default function ConceptsTab() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [stableError, setStableError] = useState<StableErrorDisplay | null>(null);

  const kind = Form.useWatch('kind', form);
  const autoGenerate = Form.useWatch('autoGenerateOnEnrollment', form);

  const load = async () => {
    setTableLoading(true);
    try {
      const rows = await financeConcept.list();
      setConcepts(rows);
    } catch (err) {
      setStableError(toStableErrorDisplay(err));
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
        title: 'Auto-generar',
        key: 'autoGenerate',
        render: (_: any, r: any) =>
          r.autoGenerateOnEnrollment ? (
            <Tag color="green">
              {r.chargeType === 'enrollment' ? 'Matrícula' : r.chargeType === 'monthly' ? 'Mensual' : 'Sí'}
            </Tag>
          ) : (
            <Tag>No</Tag>
          ),
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
    setStableError(null);
    try {
      await financeConcept.create({
        name: values.name,
        kind: values.kind,
        amountCents: Math.round(Number(values.amount) * 100),
        currency: values.currency,
        autoGenerateOnEnrollment: values.autoGenerateOnEnrollment || false,
        chargeType: values.chargeType || null,
        installmentCount: values.installmentCount ? Number(values.installmentCount) : null,
      });
      message.success('Concepto creado');
      form.resetFields(['name']);
      await load();
    } catch (err) {
      setStableError(toStableErrorDisplay(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <StableErrorUi error={stableError} />

      <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ kind: 'monthly', currency: 'MXN', autoGenerateOnEnrollment: false }}>
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

          {/* Auto-generate options */}
          <div className="mt-4 p-4 rounded-lg bg-blue-50 border border-blue-100">
            <Form.Item name="autoGenerateOnEnrollment" label={null} valuePropName="checked">
              <Switch checkedChildren="Auto-generar" unCheckedChildren="Manual" />
            </Form.Item>
            <p className="text-xs text-gray-500 -mt-2 mb-3">
              Generar automáticamente al matricular un alumno
            </p>

            {autoGenerate && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Form.Item name="chargeType" label="Tipo de cargo">
                  <Select
                    allowClear
                    placeholder="Seleccionar..."
                    options={[
                      { value: 'enrollment', label: 'Matrícula (único)' },
                      { value: 'monthly', label: 'Mensualidad (varios)' },
                      { value: 'annual', label: 'Anual (con descuento)' },
                    ]}
                  />
                </Form.Item>

                <Form.Item name="installmentCount" label="Número de cuotas">
                  <InputNumber
                    className="w-full"
                    min={1}
                    max={12}
                    placeholder="10"
                    disabled={form.getFieldValue('chargeType') !== 'monthly'}
                  />
                  <p className="text-xs text-gray-400 mt-1">Solo para mensualidades</p>
                </Form.Item>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
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
