'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getParentDashboardData } from '@/actions/parent';
import { getAccountInfo, type AccountInfo } from '@/actions/cafeteria';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['parent']);

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ParentCafeteriaPage() {
  const { message } = App.useApp();
  const [children, setChildren] = useState<{ id: string; name: string }[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAccount = async (childId: string) => {
    if (!childId) return;
    setLoading(true);
    try {
      setAccount(await getAccountInfo(childId));
    } catch (e: any) {
      message.error(e.message || 'Error al cargar cuenta');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const dashboard = await getParentDashboardData();
      const childOptions = dashboard.children.map((c: any) => ({ id: c.id, name: c.name }));
      setChildren(childOptions);
      const firstChild = childOptions[0]?.id ?? '';
      setSelectedChildId(firstChild);
      if (firstChild) await loadAccount(firstChild);
      else setLoading(false);
    })();
  }, []);

  return (
    <DashboardLayout roleTitle="Portal de Padres" userName="Familia" userRole="Padre/Tutor" menuGroups={menuGroups} breadcrumbs={['Familia', 'Cafetería']}>
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Cafetería</h1>
        {children.length > 0 && (
          <select
            value={selectedChildId}
            onChange={(e) => {
              setSelectedChildId(e.target.value);
              loadAccount(e.target.value);
            }}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {children.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Cargando...</div>
      ) : children.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">family_restroom</span>
          <p className="text-gray-500">No hay estudiantes vinculados a tu cuenta.</p>
        </div>
      ) : !account ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <p className="text-gray-500">Sin cuenta de cafetería registrada.</p>
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
