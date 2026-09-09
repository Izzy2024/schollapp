'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getMyPayrollEntries, type MyPayrollEntryRow } from '@/actions/hr';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['teacher']);

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function TeacherPayrollPage() {
  const { message } = App.useApp();
  const [entries, setEntries] = useState<MyPayrollEntryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyPayrollEntries()
      .then(setEntries)
      .catch((e: any) => message.error(e.message || 'Error al cargar nómina'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout roleTitle="Docente" userName="Docente" userRole="Profesor" menuGroups={menuGroups} breadcrumbs={['Docente', 'Mi Nómina']}>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Mi Nómina</h1>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Cargando...</div>
      ) : entries.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-500">No hay recibos de nómina registrados.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 text-gray-600 font-medium border-b border-gray-100">
              <tr>
                <th className="px-5 py-3">Período</th>
                <th className="px-5 py-3 text-right">Bruto</th>
                <th className="px-5 py-3 text-right">Deducciones</th>
                <th className="px-5 py-3 text-right">Neto</th>
                <th className="px-5 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((e, i) => (
                <tr key={i}>
                  <td className="px-5 py-3 font-medium text-gray-900">{e.periodName}</td>
                  <td className="px-5 py-3 text-right">{formatMoney(e.grossCents)}</td>
                  <td className="px-5 py-3 text-right text-red-600">-{formatMoney(e.deductionsCents)}</td>
                  <td className="px-5 py-3 text-right font-semibold">{formatMoney(e.netCents)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${e.paidAt ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                      {e.paidAt ? 'Pagado' : 'Pendiente'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
