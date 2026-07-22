'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { App, Button, Form, Input, InputNumber, Select, Table, Switch } from 'antd';
import * as financeDiscount from '@/actions/finance/discounts';
import * as financeConcept from '@/actions/finance/concepts';
import { StableErrorUi, toStableErrorDisplay, type StableErrorDisplay } from './stableErrorUi';

type Discount = Awaited<ReturnType<typeof financeDiscount.list>>[number];
type Concept = Awaited<ReturnType<typeof financeConcept.list>>[number];

const KIND_LABELS: Record<string, string> = {
  sibling: 'Hermanos',
  scholarship: 'Beca',
  prompt_payment: 'Pronto pago',
  financial_aid: 'Apoyo financiero',
  custom: 'Personalizado',
};

const APPLIES_TO_LABELS: Record<string, string> = {
  enrollment: 'Matrícula',
  tuition: 'Colegiatura',
  all_charges: 'Todos los cargos',
  specific_concept: 'Concepto específico',
};

export default function DiscountsTab() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [stableError, setStableError] = useState<StableErrorDisplay | null>(null);

  const kind = Form.useWatch('kind', form);
  const appliesTo = Form.useWatch('appliesTo', form);

  const load = async () => {
    setTableLoading(true);
    try {
      const [rows, conceptRows] = await Promise.all([financeDiscount.list(), financeConcept.list()]);
      setDiscounts(rows);
      setConcepts(conceptRows);
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

  const conceptNameById = useMemo(() => new Map(concepts.map((c) => [c.id, c.name])), [concepts]);

  const columns = useMemo(
    () => [
      { title: 'Nombre', dataIndex: 'name', key: 'name' },
      { title: 'Tipo', dataIndex: 'kind', key: 'kind', render: (v: string) => KIND_LABELS[v] || v },
      {
        title: 'Regla',
        key: 'rule',
        render: (_: any, r: Discount) => (r.percentage != null ? `${r.percentage}%` : `${((r.fixedCents || 0) / 100).toFixed(2)}`),
      },
      {
        title: 'Aplica a',
        key: 'appliesTo',
        render: (_: any, r: Discount) =>
          r.appliesTo === 'specific_concept'
            ? `${APPLIES_TO_LABELS[r.appliesTo]}: ${conceptNameById.get(r.conceptIdFilter || '') || '—'}`
            : APPLIES_TO_LABELS[r.appliesTo] || r.appliesTo,
      },
      {
        title: 'Usos',
        key: 'uses',
        render: (_: any, r: Discount) => `${r.currentUses}${r.maxUses ? ` / ${r.maxUses}` : ''}`,
      },
      {
        title: 'Activo',
        key: 'isActive',
        render: (_: any, r: Discount) => (
          <Switch
            checked={r.isActive}
            onChange={async (checked) => {
              try {
                await financeDiscount.setActive(r.id, checked);
                message.success(checked ? 'Descuento activado' : 'Descuento desactivado');
                await load();
              } catch (err) {
                setStableError(toStableErrorDisplay(err));
              }
            }}
          />
        ),
      },
    ],
    [conceptNameById]
  );

  const onFinish = async (values: any) => {
    setLoading(true);
    setStableError(null);
    try {
      await financeDiscount.create({
        name: values.name,
        code: values.code || null,
        kind: values.kind,
        percentage: values.mode === 'percentage' ? Number(values.value) : null,
        fixedCents: values.mode === 'fixed' ? Math.round(Number(values.value) * 100) : null,
        appliesTo: values.appliesTo,
        conceptIdFilter: values.appliesTo === 'specific_concept' ? values.conceptIdFilter : null,
        maxUses: values.maxUses ? Number(values.maxUses) : null,
        siblingMinCount: values.kind === 'sibling' ? Number(values.siblingMinCount || 1) : null,
      });
      message.success('Descuento creado');
      form.resetFields(['name', 'code', 'value']);
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
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ mode: 'percentage', appliesTo: 'all_charges' }}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Form.Item name="name" label="Nombre" rules={[{ required: true, message: 'Ingresa el nombre' }]}>
              <Input placeholder="Beca Hermanos" />
            </Form.Item>

            <Form.Item name="code" label="Código (opcional)">
              <Input placeholder="HERMANOS10" />
            </Form.Item>

            <Form.Item name="kind" label="Tipo" rules={[{ required: true }]}>
              <Select
                options={Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }))}
              />
            </Form.Item>

            <Form.Item name="appliesTo" label="Aplica a" rules={[{ required: true }]}>
              <Select options={Object.entries(APPLIES_TO_LABELS).map(([value, label]) => ({ value, label }))} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Form.Item name="mode" label="Modo">
              <Select
                options={[
                  { value: 'percentage', label: 'Porcentaje' },
                  { value: 'fixed', label: 'Monto fijo' },
                ]}
              />
            </Form.Item>

            <Form.Item name="value" label="Valor" rules={[{ required: true, message: 'Ingresa el valor' }]}>
              <InputNumber className="w-full" min={0} step={0.01} placeholder="10" />
            </Form.Item>

            {appliesTo === 'specific_concept' && (
              <Form.Item name="conceptIdFilter" label="Concepto" rules={[{ required: true }]}>
                <Select options={concepts.map((c) => ({ value: c.id, label: c.name }))} />
              </Form.Item>
            )}

            {kind === 'sibling' && (
              <Form.Item
                name="siblingMinCount"
                label="Mínimo de hermanos"
                initialValue={1}
                tooltip="No cuenta al propio alumno. 1 = aplica si tiene al menos 1 hermano matriculado."
              >
                <InputNumber className="w-full" min={1} />
              </Form.Item>
            )}

            <Form.Item name="maxUses" label="Máximo de usos (opcional)">
              <InputNumber className="w-full" min={1} placeholder="Sin límite" />
            </Form.Item>
          </div>

          <div className="flex gap-2 mt-2">
            <Button type="primary" htmlType="submit" loading={loading}>
              Crear descuento
            </Button>
            <Button onClick={load} disabled={tableLoading}>
              Refrescar
            </Button>
          </div>
        </Form>
      </div>

      <Table rowKey="id" loading={tableLoading} dataSource={discounts} columns={columns as any} pagination={{ pageSize: 10 }} />

      <p className="text-xs text-gray-400">
        Los descuentos de hermanos se aplican automáticamente al generar cargos de matrícula/mensualidad para conceptos con
        &quot;Descuento hermanos&quot; activado. Beca, pronto pago, apoyo financiero y personalizado se aplican manualmente
        desde la pestaña Cargos.
      </p>
    </div>
  );
}
