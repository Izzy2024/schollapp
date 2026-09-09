'use client';

import React, { useEffect, useState } from 'react';
import { Select, Tag, Empty, Spin } from 'antd';
import { getForStudent } from '@/actions/finance/statements';
import * as financeCharge from '@/actions/finance/charges';
import { StableErrorUi, toStableErrorDisplay, type StableErrorDisplay } from './stableErrorUi';
import RecordPaymentModal from './RecordPaymentModal';

type Statement = Awaited<ReturnType<typeof getForStudent>>;

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('es-PA', { minimumFractionDigits: 2 })}`;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pendiente', color: 'gold' },
  paid: { label: 'Pagado', color: 'green' },
  overdue: { label: 'Vencido', color: 'red' },
  void: { label: 'Anulado', color: 'default' },
};

export default function StatementTab() {
  const [students, setStudents] = useState<{ value: string; label: string }[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [statement, setStatement] = useState<Statement>(null);
  const [loading, setLoading] = useState(false);
  const [stableError, setStableError] = useState<StableErrorDisplay | null>(null);
  const [recordOpen, setRecordOpen] = useState(false);
  const [recordChargeId, setRecordChargeId] = useState<string | null>(null);

  useEffect(() => {
    financeCharge.listStudentsForSelect().then(setStudents).catch(() => {});
  }, []);

  const load = async (id: string) => {
    setLoading(true);
    setStableError(null);
    try {
      const data = await getForStudent(id);
      setStatement(data);
    } catch (err) {
      setStableError(toStableErrorDisplay(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (studentId) load(studentId);
  }, [studentId]);

  return (
    <div className="space-y-6">
      <StableErrorUi error={stableError} />

      <Select
        className="w-full md:w-96"
        showSearch
        placeholder="Selecciona un alumno para ver su estado de cuenta"
        value={studentId}
        onChange={setStudentId}
        options={students}
        filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
      />

      {loading ? (
        <div className="text-center py-12"><Spin /></div>
      ) : !statement ? (
        <Empty description={studentId ? 'Sin cargos ni pagos registrados' : 'Selecciona un alumno'} />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
              <div className="text-xs text-gray-500">Total cargado</div>
              <div className="text-xl font-bold text-gray-900">{formatCents(statement.totals.chargesCents)}</div>
            </div>
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
              <div className="text-xs text-gray-500">Total pagado</div>
              <div className="text-xl font-bold text-green-600">{formatCents(statement.totals.paymentsCents)}</div>
            </div>
            <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
              <div className="text-xs text-gray-500">Saldo pendiente</div>
              <div className={`text-xl font-bold ${statement.totals.balanceDueCents > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {formatCents(statement.totals.balanceDueCents)}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Cargos</h3>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
              {statement.charges.length === 0 ? (
                <div className="p-4 text-sm text-gray-400 text-center">Sin cargos</div>
              ) : (
                statement.charges.map((c) => {
                  const paidForCharge = statement.payments
                    .filter((p) => p.chargeId === c.id)
                    .reduce((sum, p) => sum + p.amountCents, 0);
                  const status = STATUS_LABELS[c.status] ?? { label: c.status, color: 'default' };
                  return (
                    <div key={c.id} className="flex items-center justify-between px-4 py-3 bg-white">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{c.conceptName}</div>
                        <div className="text-xs text-gray-400">
                          {c.periodKey ?? '—'} · Vence {c.dueDate ? new Date(c.dueDate).toLocaleDateString('es-PA') : '—'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-semibold text-gray-900">{formatCents(c.amountCents)}</div>
                          {paidForCharge > 0 && paidForCharge < c.amountCents && (
                            <div className="text-xs text-amber-600">Abonado {formatCents(paidForCharge)}</div>
                          )}
                        </div>
                        <Tag color={status.color}>{status.label}</Tag>
                        {c.status !== 'paid' && c.status !== 'void' && (
                          <button
                            onClick={() => {
                              setRecordChargeId(c.id);
                              setRecordOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                          >
                            Registrar pago
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Pagos</h3>
            <div className="divide-y divide-gray-100 rounded-xl border border-gray-100 overflow-hidden">
              {statement.payments.length === 0 ? (
                <div className="p-4 text-sm text-gray-400 text-center">Sin pagos</div>
              ) : (
                statement.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-white">
                    <div>
                      <div className="text-sm text-gray-900">{new Date(p.paidAt).toLocaleDateString('es-PA')} · {p.method}</div>
                      {p.note && <div className="text-xs text-gray-400">{p.note}</div>}
                    </div>
                    <div className="text-sm font-semibold text-green-600">{formatCents(p.amountCents)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      <RecordPaymentModal
        open={recordOpen}
        chargeId={recordChargeId}
        studentId={studentId}
        onClose={() => {
          setRecordOpen(false);
          setRecordChargeId(null);
        }}
        onRecorded={async () => {
          if (studentId) await load(studentId);
        }}
      />
    </div>
  );
}
