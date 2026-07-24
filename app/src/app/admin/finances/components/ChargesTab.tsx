'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { Button, Form, Input, InputNumber, DatePicker, Select, Table, Tag, Modal } from 'antd';
import { App } from 'antd';
import * as financeConcept from '@/actions/finance/concepts';
import * as financeCharge from '@/actions/finance/charges';
import * as financeDiscount from '@/actions/finance/discounts';
import * as financePaymentPlan from '@/actions/finance/payment-plans';
import { generateInvoice } from '@/actions/finance/invoices';
import { StableErrorUi, toStableErrorDisplay, type StableErrorDisplay } from './stableErrorUi';
import RecordPaymentModal from './RecordPaymentModal';

type Concept = Awaited<ReturnType<typeof financeConcept.list>>[number];
type Charge = Awaited<ReturnType<typeof financeCharge.listByPeriod>>[number];

const PERIOD_RE = /^\d{4}(-[A-Z0-9]+)?$/i;

export default function ChargesTab() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [conceptsLoading, setConceptsLoading] = useState(false);
  const [students, setStudents] = useState<{value: string, label: string}[]>([]);

  const [generating, setGenerating] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [charges, setCharges] = useState<Charge[]>([]);
  const [stableError, setStableError] = useState<StableErrorDisplay | null>(null);
  const [lastGenerateInfo, setLastGenerateInfo] = useState<string | null>(null);

  const [recordOpen, setRecordOpen] = useState(false);
  const [recordChargeId, setRecordChargeId] = useState<string | null>(null);
  const [recordStudentId, setRecordStudentId] = useState<string | null>(null);
  const [generatingInvoice, setGeneratingInvoice] = useState<string | null>(null);

  const [discounts, setDiscounts] = useState<Awaited<ReturnType<typeof financeDiscount.list>>>([]);
  const [discountChargeId, setDiscountChargeId] = useState<string | null>(null);
  const [discountId, setDiscountId] = useState<string | null>(null);
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  const [voidChargeId, setVoidChargeId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const [planChargeId, setPlanChargeId] = useState<string | null>(null);
  const [planInstallmentCount, setPlanInstallmentCount] = useState<number>(3);
  const [planStartDate, setPlanStartDate] = useState<Dayjs | null>(dayjs());
  const [creatingPlan, setCreatingPlan] = useState(false);

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
    financeCharge.listStudentsForSelect().then(setStudents);
    financeDiscount.list().then((rows) => setDiscounts(rows.filter((d) => d.isActive && d.kind !== 'sibling')));
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
          const colors: Record<string, string> = {
            pending: 'gold',
            paid: 'green',
            overdue: 'red',
            void: 'default',
          };
          const labels: Record<string, string> = {
            pending: 'Pendiente',
            paid: 'Pagado',
            overdue: 'Vencido',
            void: 'Anulado',
          };
          return <Tag color={colors[v] || 'default'}>{labels[v] || v}</Tag>;
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
          <div className="flex gap-2">
            <Button
              size="small"
              disabled={r.status === 'void'}
              onClick={() => {
                setRecordChargeId(r.id);
                setRecordStudentId(r.student.id);
                setRecordOpen(true);
              }}
            >
              Registrar pago
            </Button>
            <Button
              size="small"
              disabled={r.status === 'void'}
              loading={generatingInvoice === r.id}
              onClick={async () => {
                setGeneratingInvoice(r.id);
                try {
                  const invoice = await generateInvoice({ chargeId: r.id });
                  message.success(`Factura ${invoice.folio} generada`);
                  // Open PDF
                  window.open(`/api/invoices/${invoice.id}/pdf`, '_blank');
                } catch (err: any) {
                  message.error(err.message || 'Error generando factura');
                } finally {
                  setGeneratingInvoice(null);
                }
              }}
            >
              Factura
            </Button>
            <Button
              size="small"
              disabled={r.status === 'void'}
              onClick={() => {
                setDiscountChargeId(r.id);
                setDiscountId(null);
              }}
            >
              Aplicar descuento
            </Button>
            <Button
              size="small"
              disabled={r.status === 'paid' || r.status === 'void'}
              onClick={() => {
                setPlanChargeId(r.id);
                setPlanInstallmentCount(3);
                setPlanStartDate(dayjs());
              }}
            >
              Plan de pago
            </Button>
            <Button
              size="small"
              danger
              disabled={r.status === 'void' || r.status === 'paid'}
              onClick={() => {
                setVoidChargeId(r.id);
                setVoidReason('');
              }}
            >
              Anular
            </Button>
          </div>
        ),
      },
    ],
    [discounts]
  );

  const onGenerate = async () => {
    setStableError(null);
    setLastGenerateInfo(null);

    const values = await form.validateFields();

    // Light client validation (server is source of truth)
    if (!PERIOD_RE.test(values.periodKey)) {
      setStableError(toStableErrorDisplay(new Error('Formato inválido. Usa YYYY-MM, YYYY-MAT o YYYY.')));
      return;
    }

    setGenerating(true);
    try {
      const result = await financeCharge.generateForPeriod({
        periodKey: values.periodKey,
        conceptId: values.conceptId,
        studentIds: values.studentIds && values.studentIds.length > 0 ? values.studentIds : undefined,
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Form.Item
              name="periodKey"
              label="Periodo (ej. 2026-03 o 2026-MAT)"
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

            <Form.Item name="studentIds" label="Alumnos (opcional)">
              <Select
                mode="multiple"
                allowClear
                placeholder="Todos los activos si se deja vacío"
                options={students}
                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
              />
            </Form.Item>

            <div className="flex items-end">
              <Button type="primary" onClick={onGenerate} loading={generating} block>
                Generar cargos
              </Button>
            </div>
          </div>
        </Form>
        <div className="flex justify-end gap-2 mt-2">
          <Button size="small" onClick={() => refreshCharges()} loading={tableLoading}>
            Refrescar cargos
          </Button>
          <Button size="small" onClick={loadConcepts} loading={conceptsLoading}>
            Refrescar conceptos
          </Button>
        </div>
      </div>

      <Table
        rowKey="id"
        loading={tableLoading}
        dataSource={charges}
        columns={columns as any}
        rowClassName={(r: Charge) => (r.status === 'void' ? 'opacity-50 line-through' : '')}
        pagination={{ pageSize: 10 }}
      />

      <RecordPaymentModal
        open={recordOpen}
        chargeId={recordChargeId}
        studentId={recordStudentId}
        onClose={() => {
          setRecordOpen(false);
          setRecordChargeId(null);
          setRecordStudentId(null);
        }}
        onRecorded={async () => {
          await refreshCharges();
        }}
      />

      <Modal
        title="Anular cargo"
        open={!!voidChargeId}
        confirmLoading={voiding}
        okText="Anular cargo"
        okButtonProps={{ danger: true, disabled: !voidReason.trim() }}
        onCancel={() => setVoidChargeId(null)}
        onOk={async () => {
          if (!voidChargeId) return;
          setVoiding(true);
          try {
            await financeCharge.voidCharge({ chargeId: voidChargeId, reason: voidReason });
            message.success('Cargo anulado');
            setVoidChargeId(null);
            await refreshCharges();
          } catch (err) {
            setStableError(toStableErrorDisplay(err));
          } finally {
            setVoiding(false);
          }
        }}
      >
        <p className="text-sm text-gray-500">
          El cargo no se borra: queda marcado como anulado y deja de contar en el estado de cuenta del alumno.
        </p>
        <Input.TextArea
          rows={3}
          placeholder="Motivo (ej. cargo duplicado, monto equivocado)"
          value={voidReason}
          onChange={(e) => setVoidReason(e.target.value)}
        />
      </Modal>

      <Modal
        title="Aplicar descuento al cargo"
        open={!!discountChargeId}
        confirmLoading={applyingDiscount}
        onCancel={() => setDiscountChargeId(null)}
        onOk={async () => {
          if (!discountChargeId || !discountId) return;
          setApplyingDiscount(true);
          try {
            await financeDiscount.applyToCharge(discountChargeId, discountId);
            message.success('Descuento aplicado');
            setDiscountChargeId(null);
            await refreshCharges();
          } catch (err) {
            setStableError(toStableErrorDisplay(err));
          } finally {
            setApplyingDiscount(false);
          }
        }}
        okButtonProps={{ disabled: !discountId }}
      >
        <Select
          className="w-full"
          placeholder="Selecciona un descuento"
          value={discountId}
          onChange={setDiscountId}
          options={discounts.map((d) => ({
            value: d.id,
            label: `${d.name} (${d.percentage != null ? `${d.percentage}%` : `${((d.fixedCents || 0) / 100).toFixed(2)}`})`,
          }))}
        />
      </Modal>

      <Modal
        title="Convertir cargo en plan de pago"
        open={!!planChargeId}
        confirmLoading={creatingPlan}
        onCancel={() => setPlanChargeId(null)}
        onOk={async () => {
          if (!planChargeId || !planStartDate) return;
          setCreatingPlan(true);
          try {
            await financePaymentPlan.createPaymentPlan({
              chargeId: planChargeId,
              installmentCount: planInstallmentCount,
              startDate: planStartDate.toDate(),
            });
            message.success('Plan de pago creado');
            setPlanChargeId(null);
            await refreshCharges();
          } catch (err) {
            setStableError(toStableErrorDisplay(err));
          } finally {
            setCreatingPlan(false);
          }
        }}
        okButtonProps={{ disabled: !planStartDate || planInstallmentCount < 2 }}
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500">Número de cuotas</label>
            <InputNumber className="w-full" min={2} max={24} value={planInstallmentCount} onChange={(v) => setPlanInstallmentCount(v || 2)} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Fecha de primera cuota</label>
            <DatePicker className="w-full" value={planStartDate} onChange={setPlanStartDate} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
