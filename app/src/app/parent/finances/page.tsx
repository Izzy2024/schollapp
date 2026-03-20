import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getForParent } from '@/actions/finance/statements';

const menuGroups = [
  {
    title: 'Panel Familiar',
    items: [
      { key: '1', icon: 'family_restroom', label: 'Mis Hijos', href: '/parent' },
      { key: '2', icon: 'attach_money', label: 'Pagos y Finanzas', href: '/parent/finances' },
      { key: '3', icon: 'calendar_month', label: 'Calendario', href: '/parent/calendar' },
      { key: '4', icon: 'mail', label: 'Mensajes', href: '/parent/messages', badge: 1 },
      { key: '5', icon: 'description', label: 'Documentos', href: '/parent/documents' },
    ],
  },
  {
    title: 'Configuración',
    items: [
      { key: '6', icon: 'campaign', label: 'Noticias', href: '/parent/news' },
      { key: '7', icon: 'settings', label: 'Configuración', href: '/parent/settings' },
    ],
  },
];

function formatMoneyFromCents(amountCents: number, currency = 'MXN'): string {
  const amount = (amountCents ?? 0) / 100;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(d);
}

export default async function ParentFinancesPage() {
  let data: Awaited<ReturnType<typeof getForParent>> | null = null;
  let errorCode: string | null = null;

  try {
    data = await getForParent();
  } catch (err: unknown) {
    const e = err as { code?: unknown; cause?: { code?: unknown }; message?: unknown };
    const code = e?.code ?? e?.cause?.code ?? e?.message;
    errorCode = typeof code === 'string' ? code : 'UNKNOWN_ERROR';
  }

  const empty = !errorCode && data && data.students.length === 0;

  return (
    <DashboardLayout
      roleTitle="Tutor / Padre"
      userName="Familia"
      userRole="Tutor"
      menuGroups={menuGroups}
      breadcrumbs={['Familia', 'Pagos y Finanzas']}
    >
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagos y Finanzas</h1>
          <p className="text-sm text-gray-500 mt-1">Estado de cuenta calculado desde cargos y pagos registrados.</p>
        </div>
      </div>

      {!data && !errorCode ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="stat-card p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : errorCode ? (
        <div className="stat-card p-6 border border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-red-600">error</span>
            <div>
              <h2 className="font-semibold text-red-900">No se pudo cargar el estado de cuenta</h2>
              <p className="text-sm text-red-800 mt-1">
                Código: <span className="font-mono">{errorCode}</span>
              </p>
            </div>
          </div>
        </div>
      ) : empty ? (
        <div className="stat-card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Sin cargos todavía</h2>
          <p className="text-sm text-gray-600 mt-1">Cuando la escuela genere cargos para tus hijos, aparecerán aquí.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Totals */}
          <div className="stat-card p-6 bg-gradient-to-b from-white to-blue-50/30">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Resumen</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <div className="p-4 rounded-xl bg-white border border-gray-100">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Cargos</div>
                <div className="text-lg font-bold text-gray-900 mt-1">{formatMoneyFromCents(data?.totals.chargesCents ?? 0, 'MXN')}</div>
              </div>
              <div className="p-4 rounded-xl bg-white border border-gray-100">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pagos</div>
                <div className="text-lg font-bold text-gray-900 mt-1">{formatMoneyFromCents(data?.totals.paymentsCents ?? 0, 'MXN')}</div>
              </div>
              <div className="p-4 rounded-xl bg-white border border-gray-100">
                <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Saldo</div>
                <div className="text-lg font-bold text-blue-700 mt-1">{formatMoneyFromCents(data?.totals.balanceDueCents ?? 0, 'MXN')}</div>
              </div>
            </div>
          </div>

          {/* Per-student */}
          {(data?.students ?? []).map((s) => (
            <div key={s.studentId} className="stat-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Alumno</h3>
                  <p className="text-xs text-gray-500 font-mono mt-1">{s.studentId}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Saldo</div>
                  <div className="text-lg font-bold text-blue-700">{formatMoneyFromCents(s.totals.balanceDueCents ?? 0, 'MXN')}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Cargos</h4>
                  {s.charges.length === 0 ? (
                    <p className="text-sm text-gray-500">Sin cargos.</p>
                  ) : (
                    <div className="space-y-2">
                      {s.charges.map((c) => (
                        <div key={c.id} className="flex items-start justify-between gap-4 p-3 rounded-xl bg-gray-50">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{c.conceptName ?? c.periodKey ?? 'Cargo'}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {c.periodKey ? `Periodo: ${c.periodKey}` : null}
                              {c.periodKey ? ' · ' : null}
                              Status: {c.status}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">{formatMoneyFromCents(c.amountCents, c.currency)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Pagos</h4>
                  {s.payments.length === 0 ? (
                    <p className="text-sm text-gray-500">Sin pagos registrados.</p>
                  ) : (
                    <div className="space-y-2">
                      {s.payments.map((p) => (
                        <div key={p.id} className="flex items-start justify-between gap-4 p-3 rounded-xl bg-emerald-50">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{formatDate(p.paidAt)}</div>
                            <div className="text-xs text-gray-600 mt-0.5">Método: {p.method}</div>
                            {p.note ? <div className="text-xs text-gray-500 mt-1">Nota: {p.note}</div> : null}
                          </div>
                          <div className="text-sm font-semibold text-gray-900 whitespace-nowrap">{formatMoneyFromCents(p.amountCents, p.currency)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
