'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, Select, Table, Tag, message } from 'antd';
import * as financeConcept from '@/actions/finance/concepts';
import * as financeCharge from '@/actions/finance/charges';
import { StableErrorUi, toStableErrorDisplay, type StableErrorDisplay } from './stableErrorUi';
import RecordPaymentModal from './RecordPaymentModal';

type Concept = Awaited<ReturnType<typeof financeConcept.list>>[number];
type Charge = Awaited<ReturnType<typeof financeCharge.listByPeriod>>[number];

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export default function ChargesTab() {
  const [form] = Form.useForm();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [conceptsLoading, setConceptsLoading] = useState(false);

  const [generating, setGenerating] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [stableError, setStableError] = useState<StableErrorDisplay | null>(null);
  const [lastGenerateInfo, setLastGenerateInfo] = useState<string | null>(null);

  const [recordOpen, setRecordOpen] = useState(false);
  const [recordChargeId, setRecordChargeId] = useState<string | null>(null);

  const loadConcepts = async () => {
    setConceptsLoading(true);
    try {
      const rows = await financeConcept.list();
      setConcepts(rows);

      const currentConceptId = form.getFieldValue('conceptId');
      if (!currentConceptId && rows.length) {
        form.setFieldValue('conceptId', rows[0].id);
      }
    } catch (err) {
      setStableError(toStableErrorDisplay(err));
    } finally {
      setConceptsLoading(false);
    }
  };

  const refreshCharges = async (values?: { periodKey?: string; conceptId?: string }) => {
    const v = values ?? form.getFieldsValue();
    if (!v.periodKey) return;

    setTableLoading(true);
    try {
      const rows = await financeCharge.listByPeriod({ periodKey: v.periodKey, conceptId: v.conceptId || undefined });
      setCharges(rows);
    } catch (err) {
      setStableError(toStableErrorDisplay(err));
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    loadConcepts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = useMemo(
    () => [
      { title: 'Alumno', key: 'student', render: (_: any, r: Charge) => `${r.student.firstName} ${r.student.lastName}` },
      { title: 'Concepto', key: 'concept', render: (_: any, r: Charge) => r.concept.name },
      {
        title: 'Monto',
        key: 'amount',
        render: (_: any, r: Charge) => `${(r.amountCents / 100).toFixed(2)} ${r.currency}`,
      },
      {
        title: 'Estado',
        dataIndex: 'status',
        key: 'status',
        render: (v: string) => {
          const color = v === 'paid' ? 'green' : v === 'void' ? 'default' : 'gold';
          return <Tag color={color}>{String(v).toUpperCase()}</Tag>;
        },
      },
      { title: 'Periodo', dataIndex: 'periodKey', key: 'periodKey' },
      {
        title: 'Creado',
        dataIndex: 'createdAt',
        key: 'createdAt',
        render: (v: string) => new Date(v).toLocaleString(),
      },
      {
        title: 'Acciones',
        key: 'actions',
        render: (_: any, r: Charge) => (
          <Button
            size="small"
            onClick={() => {
              setRecordChargeId(r.id);
              setRecordOpen(true);
            }}
          >
            Registrar pago
          </Button>
        ),
      },
    ],
    []
  );

  const onGenerate = async () => {
    setStableError(null);
    setLastGenerateInfo(null);

    const values = await form.validateFields();

    // Light client validation (server is source of truth)
    if (!PERIOD_RE.test(values.periodKey)) {
      setStableError(toStableErrorDisplay(new Error('Formato inválido. Usa YYYY-MM')));
      return;
    }

    setGenerating(true);
    try {
      const result = await financeCharge.generateForPeriod({
        periodKey: values.periodKey,
        conceptId: values.conceptId,
      });

      // Must-have: idempotency should be visible but not an error.
      if (result.createdCount === 0) {
        setLastGenerateInfo(`Idempotente: 0 creados (skipped=${result.skippedCount})`);
      } else {
        setLastGenerateInfo(`Generación lista: creados=${result.createdCount} (skipped=${result.skippedCount})`);
      }

      await refreshCharges(values);
    } catch (err) {
      setStableError(toStableErrorDisplay(err));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <StableErrorUi error={stableError} />
      {lastGenerateInfo ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">{lastGenerateInfo}</div>
      ) : null}

      <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
        <Form
          form={form}
          layout="vertical"
          initialValues={{ periodKey: new Date().toISOString().slice(0, 7) }}
          onValuesChange={(changed, all) => {
            if (changed.periodKey || changed.conceptId) {
              // best-effort auto refresh when user edits values
              if (all.periodKey && PERIOD_RE.test(all.periodKey)) refreshCharges(all);
            }
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Form.Item
              name="periodKey"
              label="Periodo (YYYY-MM)"
              rules={[{ required: true, message: 'Ingresa el periodo' }]}
            >
              <Input placeholder="2026-03" />
            </Form.Item>

            <Form.Item name="conceptId" label="Concepto" rules={[{ required: true, message: 'Selecciona un concepto' }]}>
              <Select
                loading={conceptsLoading}
                options={concepts.map((c) => ({ value: c.id, label: `${c.name} (${c.kind})` }))}
              />
            </Form.Item>

            <div className="flex items-end gap-2">
              <Button type="primary" onClick={onGenerate} loading={generating}>
                Generar cargos
              </Button>
              <Button onClick={() => refreshCharges()} disabled={tableLoading}>
                Refrescar
              </Button>
              <Button onClick={loadConcepts} disabled={conceptsLoading}>
                Refrescar conceptos
              </Button>
            </div>
          </div>
        </Form>
      </div>

      <Table rowKey="id" loading={tableLoading} dataSource={charges} columns={columns as any} pagination={{ pageSize: 10 }} />

      <RecordPaymentModal
        open={recordOpen}
        chargeId={recordChargeId}
        onClose={() => {
          setRecordOpen(false);
          setRecordChargeId(null);
        }}
        onRecorded={async () => {
          await refreshCharges();
        }}
      />
    </div>
  );
}
