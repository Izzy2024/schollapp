'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { message } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';
import type { DirectorFinancialSummary } from '@/actions/reports';

const menuGroups = getMenuGroupsForRoles(['director']);

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  paid: 'Pagado',
  overdue: 'Vencido',
  cancelled: 'Cancelado',
};

export default function DirectorFinancialsPage() {
  const [data, setData] = useState<DirectorFinancialSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { getDirectorFinancialSummary } = await import('@/actions/reports');
        const result = await getDirectorFinancialSummary();
        setData(result);
      } catch (e: any) {
        message.error(e.message || 'Error cargando datos financieros');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout
      roleTitle="Director"
      userName="Director"
      userRole="Director"
      menuGroups={menuGroups}
      breadcrumbs={['Director', 'Finanzas']}
    >
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Finanzas</h1>
        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-bold">
          Vista General
        </span>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>
          Cargando datos financieros...
        </div>
      ) : !data ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">account_balance</span>
          <p className="text-gray-500">No se pudieron cargar los datos financieros.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {[
              { label: 'Cargos Totales', value: formatCents(data.totalChargesCents), icon: 'receipt_long', color: 'bg-blue-50 text-blue-600', sub: `${data.chargeCount} cargos` },
              { label: 'Pagos Recibidos', value: formatCents(data.totalPaymentsCents), icon: 'payments', color: 'bg-green-50 text-green-600', sub: `${data.paymentCount} pagos` },
              { label: 'Saldo Pendiente', value: formatCents(data.balanceDueCents), icon: 'account_balance_wallet', color: data.balanceDueCents > 0 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600', sub: data.balanceDueCents > 0 ? 'Por cobrar' : 'Al corriente' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className={`p-3 rounded-xl ${kpi.color}`}>
                  <span className="material-symbols-outlined text-2xl">{kpi.icon}</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">{kpi.label}</div>
                  <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
                  <div className="text-xs text-gray-400">{kpi.sub}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Collection rate */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-gray-900">Tasa de Cobranza</h2>
              <span className="text-2xl font-bold text-gray-900">{data.collectionRate}%</span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${data.collectionRate}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Charges by status */}
            {data.chargesByStatus.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Cargos por Estado</h2>
                <div className="space-y-3">
                  {data.chargesByStatus.map(s => (
                    <div key={s.status} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          s.status === 'paid' ? 'bg-green-100 text-green-800' :
                          s.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                          s.status === 'overdue' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>{STATUS_LABELS[s.status] || s.status}</span>
                        <span className="text-sm text-gray-500">{s.count} cargos</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{formatCents(s.totalCents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top concepts */}
            {data.topConcepts.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Desglose por Concepto</h2>
                <div className="space-y-3">
                  {data.topConcepts.map(c => (
                    <div key={c.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <span className="text-sm font-medium text-gray-700">{c.name}</span>
                        <span className="text-xs text-gray-400 ml-2">({c.count})</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{formatCents(c.totalCents)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Recent payments */}
          {data.recentPayments.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Pagos Recientes</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Alumno</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Monto</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Método</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentPayments.map(p => (
                      <tr key={p.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2.5 px-3 text-gray-900 font-medium">{p.studentName}</td>
                        <td className="py-2.5 px-3 text-gray-700">{formatCents(p.amountCents)}</td>
                        <td className="py-2.5 px-3 text-gray-500 capitalize">{p.method}</td>
                        <td className="py-2.5 px-3 text-gray-400">
                          {new Date(p.paidAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
