'use client';

import React, { useEffect } from 'react';
import { Button, DatePicker, Form, Input, InputNumber, Modal, Select, message } from 'antd';
import dayjs from 'dayjs';
import * as financePayments from '@/actions/finance/payments';
import { StableErrorUi, toStableErrorDisplay, type StableErrorDisplay } from './stableErrorUi';

export type RecordPaymentModalProps = {
  open: boolean;
  chargeId: string | null;
  onClose: () => void;
  onRecorded?: () => Promise<void> | void;
};

const METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'manual', label: 'Manual' },
];

export default function RecordPaymentModal({ open, chargeId, onClose, onRecorded }: RecordPaymentModalProps) {
  const [form] = Form.useForm();
  const [saving, setSaving] = React.useState(false);
  const [stableError, setStableError] = React.useState<StableErrorDisplay | null>(null);

  useEffect(() => {
    if (open) {
      setStableError(null);
      setSaving(false);
      form.setFieldsValue({
        amount: undefined,
        paidAt: dayjs(),
        method: 'cash',
        note: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onSubmit = async () => {
    if (!chargeId) return;

    setStableError(null);
    setSaving(true);

    const values = await form.validateFields();

    // Store in cents in DB.
    const amountCents = Math.round(Number(values.amount) * 100);

    try {
      await financePayments.recordManual({
        chargeId,
        amountCents,
        paidAt: values.paidAt.toDate(),
        method: values.method,
        note: values.note || undefined,
      });

      message.success('Pago registrado');
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
    <Modal
      title="Registrar pago"
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
    >
      <StableErrorUi error={stableError} className="mb-3" />

      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="amount"
          label="Monto"
          rules={[
            { required: true, message: 'Ingresa el monto' },
            {
              validator: (_, v) => {
                const n = Number(v);
                if (!Number.isFinite(n) || n <= 0) return Promise.reject(new Error('Monto inválido'));
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
          <Button type="primary" htmlType="submit" loading={saving}>
            Registrar
          </Button>
        </div>
      </Form>
    </Modal>
  );
}
