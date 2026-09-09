'use client';

import React, { useEffect } from 'react';
import { App, Button, Checkbox, DatePicker, Form, Input, InputNumber, Modal, Select, Tag } from 'antd';
import dayjs from 'dayjs';
import * as financePayments from '@/actions/finance/payments';
import * as financeCharge from '@/actions/finance/charges';
import { StableErrorUi, toStableErrorDisplay, type StableErrorDisplay } from './stableErrorUi';

export type RecordPaymentModalProps = {
  open: boolean;
  chargeId: string | null;
  studentId?: string | null;
  onClose: () => void;
  onRecorded?: () => Promise<void> | void;
};

type OpenCharge = Awaited<ReturnType<typeof financeCharge.listOpenChargesForStudent>>[number];

const METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'manual', label: 'Manual' },
];

export default function RecordPaymentModal({ open, chargeId, studentId, onClose, onRecorded }: RecordPaymentModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [saving, setSaving] = React.useState(false);
  const [stableError, setStableError] = React.useState<StableErrorDisplay | null>(null);
  const [openCharges, setOpenCharges] = React.useState<OpenCharge[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);

  useEffect(() => {
    if (!open) return;

    setStableError(null);
    setSaving(false);
    setOpenCharges([]);
    setSelectedIds(chargeId ? [chargeId] : []);
    form.setFieldsValue({ amount: undefined, paidAt: dayjs(), method: 'cash', note: '' });

    if (!studentId) return;
    financeCharge
      .listOpenChargesForStudent(studentId)
      .then((rows) => {
        setOpenCharges(rows);
        const current = rows.find((r) => r.id === chargeId);
        if (current) form.setFieldValue('amount', current.remainingCents / 100);
      })
      .catch((err) => setStableError(toStableErrorDisplay(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, chargeId, studentId]);

  // Selección en orden de vencimiento: el cobro se reparte del cargo más viejo al más nuevo.
  const selected = openCharges.filter((c) => selectedIds.includes(c.id));
  const selectedTotalCents = selected.reduce((sum, c) => sum + c.remainingCents, 0);

  const toggleCharge = (id: string, checked: boolean) => {
    const next = checked ? [...selectedIds, id] : selectedIds.filter((x) => x !== id);
    setSelectedIds(next);
    const total = openCharges.filter((c) => next.includes(c.id)).reduce((sum, c) => sum + c.remainingCents, 0);
    form.setFieldValue('amount', total > 0 ? total / 100 : undefined);
  };

  const onSubmit = async () => {
    if (!selectedIds.length) return;

    setStableError(null);
    setSaving(true);

    try {
      const values = await form.validateFields();
      const amountCents = Math.round(Number(values.amount) * 100);

      await financePayments.recordManualMulti({
        chargeIds: selectedIds,
        amountCents,
        paidAt: values.paidAt.toDate(),
        method: values.method,
        note: values.note || undefined,
      });

      message.success(selectedIds.length > 1 ? `Pago aplicado a ${selectedIds.length} cuotas` : 'Pago registrado');
      onClose();
      await onRecorded?.();
    } catch (err) {
      // Must-have: visible stable error; do not close modal.
      setStableError(toStableErrorDisplay(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Registrar pago" open={open} onCancel={onClose} footer={null} destroyOnHidden>
      <StableErrorUi error={stableError} className="mb-3" />

      {openCharges.length > 0 ? (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 mb-1">Cuotas a cubrir</p>
          <p className="text-xs text-gray-500 mb-2">
            Marca varias si el pago cubre cuotas adelantadas. El monto se aplica de la más vieja a la más nueva.
          </p>
          <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-100">
            {openCharges.map((c) => (
              <label key={c.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                <Checkbox
                  checked={selectedIds.includes(c.id)}
                  onChange={(e) => toggleCharge(c.id, e.target.checked)}
                />
                <span className="flex-1 text-sm text-gray-800">
                  {c.conceptName} {c.periodKey ? <span className="text-gray-400">· {c.periodKey}</span> : null}
                  {c.status === 'overdue' ? (
                    <Tag color="red" className="ml-2">
                      Vencido
                    </Tag>
                  ) : null}
                </span>
                <span className="text-sm tabular-nums text-gray-900">
                  {(c.remainingCents / 100).toFixed(2)} {c.currency}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Seleccionado: <span className="font-medium text-gray-800">{(selectedTotalCents / 100).toFixed(2)}</span>
          </p>
        </div>
      ) : null}

      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="amount"
          label="Monto recibido"
          rules={[
            { required: true, message: 'Ingresa el monto' },
            {
              validator: (_, v) => {
                const n = Number(v);
                if (!Number.isFinite(n) || n <= 0) return Promise.reject(new Error('Monto inválido'));
                if (selectedTotalCents > 0 && Math.round(n * 100) > selectedTotalCents) {
                  return Promise.reject(new Error('El monto excede lo seleccionado. Marca otra cuota.'));
                }
                return Promise.resolve();
              },
            },
          ]}
        >
          <InputNumber className="w-full" min={0} step={0.01} stringMode placeholder="0.00" />
        </Form.Item>

        <Form.Item name="paidAt" label="Fecha de pago" rules={[{ required: true, message: 'Selecciona la fecha' }]}>
          <DatePicker className="w-full" />
        </Form.Item>

        <Form.Item name="method" label="Método" rules={[{ required: true, message: 'Selecciona el método' }]}>
          <Select options={METHODS} />
        </Form.Item>

        <Form.Item name="note" label="Nota (opcional)">
          <Input.TextArea placeholder="Ej: Pago recibido en recepción" autoSize={{ minRows: 3, maxRows: 6 }} />
        </Form.Item>

        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="primary" htmlType="submit" loading={saving} disabled={!selectedIds.length}>
            Registrar
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
