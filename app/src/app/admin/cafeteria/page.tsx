'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getMenuItems,
  createMenuItem,
  deactivateMenuItem,
  getAccountInfo,
  topUpAccount,
  recordPurchase,
  type MenuItemRow,
  type AccountInfo,
} from '@/actions/cafeteria';
import { getStudents } from '@/actions/students';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

function formatMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CafeteriaPage() {
  const { message } = App.useApp();
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [itemForm, setItemForm] = useState({ name: '', priceCents: '' });
  const [itemFormOpen, setItemFormOpen] = useState(false);

  const [studentSearch, setStudentSearch] = useState('');
  const [studentOptions, setStudentOptions] = useState<{ id: string; fullName: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [topUpAmount, setTopUpAmount] = useState('');

  const loadItems = async () => {
    try {
      setItems(await getMenuItems());
    } catch (e: any) {
      message.error(e.message || 'Error al cargar el menú');
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  useEffect(() => {
    if (!studentSearch) {
      setStudentOptions([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await getStudents(undefined, studentSearch, undefined, undefined, 1, 10);
      setStudentOptions(res.students.map((s: any) => ({ id: s.id, fullName: s.fullName })));
    }, 300);
    return () => clearTimeout(t);
  }, [studentSearch]);

  const loadAccount = async (studentId: string) => {
    try {
      setAccount(await getAccountInfo(studentId));
    } catch (e: any) {
      message.error(e.message || 'Error al cargar cuenta');
    }
  };

  const handleSelectStudent = (id: string, fullName: string) => {
    setSelectedStudentId(id);
    setStudentSearch(fullName);
    loadAccount(id);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const priceCents = Math.round(Number(itemForm.priceCents) * 100);
    const res = await createMenuItem({ name: itemForm.name, priceCents });
    if ('error' in res) message.error(res.error);
    else {
      message.success('Producto agregado');
      setItemFormOpen(false);
      setItemForm({ name: '', priceCents: '' });
      loadItems();
    }
  };

  const handleDeactivate = async (id: string) => {
    await deactivateMenuItem(id);
    loadItems();
  };

  const handleTopUp = async () => {
    if (!selectedStudentId || !topUpAmount) {
      message.error('Selecciona un alumno y un monto');
      return;
    }
    const amountCents = Math.round(Number(topUpAmount) * 100);
    const res = await topUpAccount(selectedStudentId, amountCents);
    if ('error' in res) message.error(res.error);
    else {
      message.success('Saldo recargado');
      setTopUpAmount('');
      loadAccount(selectedStudentId);
    }
  };

  const handlePurchase = async (menuItemId: string) => {
    if (!selectedStudentId) {
      message.error('Selecciona un alumno primero');
      return;
    }
    const res = await recordPurchase(selectedStudentId, menuItemId);
    if ('error' in res) message.error(res.error);
    else {
      message.success('Consumo registrado');
      loadAccount(selectedStudentId);
    }
  };

  return (
    <DashboardLayout roleTitle="Admin / Control Escolar" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'Cafetería']}>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Cafetería</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Menu management */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Menú</h3>
            <button onClick={() => setItemFormOpen(true)} className="text-sm text-blue-600 hover:underline">
              + Agregar producto
            </button>
          </div>
          {itemFormOpen && (
            <form onSubmit={handleAddItem} className="flex gap-2 mb-4">
              <input required placeholder="Producto" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} className="flex-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
              <input required type="number" step="0.01" min="0" placeholder="Precio" value={itemForm.priceCents} onChange={(e) => setItemForm({ ...itemForm, priceCents: e.target.value })} className="w-24 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
              <button type="submit" className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm">Guardar</button>
            </form>
          )}
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2">
                <span>{item.name} · {formatMoney(item.priceCents)}</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => handlePurchase(item.id)} className="text-xs text-blue-600 hover:underline" disabled={!selectedStudentId}>
                    Cobrar
                  </button>
                  <button onClick={() => handleDeactivate(item.id)} className="text-xs text-red-600 hover:underline">
                    Quitar
                  </button>
                </div>
              </div>
            ))}
            {items.length === 0 && <p className="text-sm text-gray-400">Sin productos en el menú.</p>}
          </div>
        </div>

        {/* Student account */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Cuenta del alumno</h3>
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="Buscar alumno..."
              value={studentSearch}
              onChange={(e) => {
                setStudentSearch(e.target.value);
                setSelectedStudentId('');
                setAccount(null);
              }}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
            />
            {studentOptions.length > 0 && !selectedStudentId && (
              <div className="absolute z-10 mt-1 w-full border border-gray-200 rounded-lg bg-white max-h-40 overflow-y-auto shadow-sm">
                {studentOptions.map((s) => (
                  <button key={s.id} type="button" onClick={() => handleSelectStudent(s.id, s.fullName)} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                    {s.fullName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {account && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3">
                <span className="text-sm font-medium text-indigo-900">Saldo actual</span>
                <span className="text-xl font-bold text-indigo-700">{formatMoney(account.balanceCents)}</span>
              </div>

              <div className="flex gap-2">
                <input type="number" step="0.01" min="0" placeholder="Monto a recargar" value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                <button onClick={handleTopUp} className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium">Recargar</button>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Historial</h4>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                  {account.transactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                      <span>{t.type === 'topup' ? 'Recarga' : t.menuItemName || 'Consumo'}</span>
                      <span className={t.type === 'topup' ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                        {t.type === 'topup' ? '+' : '-'}{formatMoney(t.amountCents)}
                      </span>
                    </div>
                  ))}
                  {account.transactions.length === 0 && <p className="text-xs text-gray-400">Sin movimientos.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
