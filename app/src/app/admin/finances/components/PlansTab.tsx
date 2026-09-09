'use client';

import React, { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { App, Button, Table, Tag } from 'antd';
import * as financePaymentPlan from '@/actions/finance/payment-plans';
import { StableErrorUi, toStableErrorDisplay, type StableErrorDisplay } from './stableErrorUi';

type Plan = Awaited<ReturnType<typeof financePaymentPlan.listActivePlans>>[number];

const STATUS_COLORS: Record<string, string> = { pending: 'gold', paid: 'green', overdue: 'red', cancelled: 'default' };
const STATUS_LABELS: Record<string, string> = { pending: 'Pendiente', paid: 'Pagada', overdue: 'Vencida', cancelled: 'Cancelada' };

export default function PlansTab() {
  const { message } = App.useApp();
  const [tableLoading, setTableLoading] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [stableError, setStableError] = useState<StableErrorDisplay | null>(null);
  const [payingInstallmentId, setPayingInstallmentId] = useState<string | null>(null);
  const [cancellingPlanId, setCancellingPlanId] = useState<string | null>(null);

  const load = async () => {
    setTableLoading(true);
    try {
      setPlans(await financePaymentPlan.listActivePlans());
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

  const payInstallment = async (installmentId: string) => {
    setPayingInstallmentId(installmentId);
    try {
      await financePaymentPlan.recordInstallmentPayment({ installmentId, paidAt: new Date() });
      message.success('Cuota registrada como pagada');
      await load();
    } catch (err) {
      setStableError(toStableErrorDisplay(err));
    } finally {
      setPayingInstallmentId(null);
    }
  };

  const cancelPlan = async (planId: string) => {
    setCancellingPlanId(planId);
    try {
      await financePaymentPlan.cancelPaymentPlan(planId);
      message.success('Plan cancelado');
      await load();
    } catch (err) {
      setStableError(toStableErrorDisplay(err));
    } finally {
      setCancellingPlanId(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        title: 'Alumno',
        key: 'student',
        render: (_: any, r: Plan) => `${r.charge.student.firstName} ${r.charge.student.lastName}`,
      },
      { title: 'Concepto', key: 'concept', render: (_: any, r: Plan) => r.charge.concept.name },
      {
        title: 'Progreso',
        key: 'progress',
        render: (_: any, r: Plan) => `${r.installmentsPaid} / ${r.installmentCount}`,
      },
      {
        title: 'Próxima cuota',
        key: 'nextDueDate',
        render: (_: any, r: Plan) => (r.nextDueDate ? dayjs(r.nextDueDate).format('DD/MM/YYYY') : '—'),
      },
      {
        title: 'Cuotas',
        key: 'installments',
        render: (_: any, r: Plan) => (
          <div className="flex flex-wrap gap-1">
            {r.installments.map((i) => (
              <Tag key={i.id} color={STATUS_COLORS[i.status] || 'default'}>
                #{i.number} · {(i.amountCents / 100).toFixed(2)}
                {i.status !== 'paid' && i.status !== 'cancelled' ? (
                  <Button
                    type="link"
                    size="small"
                    loading={payingInstallmentId === i.id}
                    onClick={() => payInstallment(i.id)}
                    className="!px-1"
                  >
                    Pagar
                  </Button>
                ) : (
                  <span className="ml-1">{STATUS_LABELS[i.status] || i.status}</span>
                )}
              </Tag>
            ))}
          </div>
        ),
      },
      {
        title: 'Acciones',
        key: 'actions',
        render: (_: any, r: Plan) => (
          <Button danger size="small" loading={cancellingPlanId === r.id} onClick={() => cancelPlan(r.id)}>
            Cancelar plan
          </Button>
        ),
      },
    ],
    [payingInstallmentId, cancellingPlanId]
  );

  return (
    <div className="space-y-6">
      <StableErrorUi error={stableError} />
      <div className="flex justify-end">
        <Button onClick={load} disabled={tableLoading}>
          Refrescar
        </Button>
      </div>
      <Table rowKey="id" loading={tableLoading} dataSource={plans} columns={columns as any} pagination={{ pageSize: 10 }} />
      <p className="text-xs text-gray-400">
        Los planes de pago se crean desde la pestaña Cargos, botón &quot;Plan de pago&quot;, sobre un cargo pendiente.
      </p>
    </div>
  );
}
