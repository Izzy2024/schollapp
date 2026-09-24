'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getCurrentStudent } from '@/actions/studentQueries';
import { getAccountInfo, type AccountInfo } from '@/actions/cafeteria';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function StudentCafeteriaPage() {
  const { message } = App.useApp();
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const student = await getCurrentStudent();
        if (!student) return;
        setAccount(await getAccountInfo(student.id));
      } catch (e: any) {
        message.error(e.message || 'Error al cargar cuenta');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={menuGroups} breadcrumbs={['Alumno', 'Cafetería']}>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Cafetería</h1>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Cargando...</div>
      ) : !account ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-500">No tienes cuenta de cafetería registrada.</p>
        </div>
      ) : (
        <div className="max-w-lg space-y-6">
          <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-5 py-4">
            <span className="text-sm font-medium text-indigo-900">Saldo actual</span>
            <span className="text-2xl font-bold text-indigo-700">{formatMoney(account.balanceCents)}</span>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-3">Historial</h3>
            <div className="space-y-2">
              {account.transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                  <span>{t.type === 'topup' ? 'Recarga' : t.menuItemName || 'Consumo'}</span>
                  <span className={t.type === 'topup' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                    {t.type === 'topup' ? '+' : '-'}{formatMoney(t.amountCents)}
                  </span>
                </div>
              ))}
              {account.transactions.length === 0 && <p className="text-sm text-gray-400">Sin movimientos.</p>}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
