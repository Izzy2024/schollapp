'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getParentDashboardData } from '@/actions/parent';
import { getStudentConductRecords, type ConductRecordRow } from '@/actions/conduct';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['parent']);

export default function ParentConductPage() {
  const { message } = App.useApp();
  const [children, setChildren] = useState<{ id: string; name: string }[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [records, setRecords] = useState<ConductRecordRow[]>([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadConduct = async (childId: string) => {
    if (!childId) return;
    setLoading(true);
    try {
      const data = await getStudentConductRecords(childId);
      setRecords(data.records);
      setTotalPoints(data.totalPoints);
    } catch (e: any) {
      message.error(e.message || 'Error al cargar conducta');
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
      if (firstChild) await loadConduct(firstChild);
      else setLoading(false);
    })();
  }, []);

  return (
    <DashboardLayout roleTitle="Portal de Padres" userName="Familia" userRole="Padre/Tutor" menuGroups={menuGroups} breadcrumbs={['Familia', 'Conducta']}>
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Conducta</h1>
        <div className="flex items-center gap-3">
          {children.length > 0 && (
            <select
              value={selectedChildId}
              onChange={(e) => {
                setSelectedChildId(e.target.value);
                loadConduct(e.target.value);
              }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {!loading && children.length > 0 && (
            <span className={`px-3 py-1 rounded-full text-sm font-bold ${totalPoints < 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'}`}>
              {totalPoints > 0 ? '+' : ''}{totalPoints} pts
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Cargando...</div>
      ) : children.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">family_restroom</span>
          <p className="text-gray-500">No hay estudiantes vinculados a tu cuenta.</p>
        </div>
      ) : records.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">verified_user</span>
          <p className="text-gray-500">Sin registros de conducta.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    r.type === 'merit' ? 'bg-green-100 text-green-800' : r.type === 'demerit' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {r.type === 'merit' ? 'Mérito' : r.type === 'demerit' ? 'Demérito' : 'Incidente'}
                </span>
                {r.category && <span className="text-xs text-gray-500">{r.category}</span>}
                <span className={`text-xs font-bold ${r.points < 0 ? 'text-red-600' : r.points > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                  {r.points > 0 ? '+' : ''}{r.points} pts
                </span>
              </div>
              <p className="text-sm text-gray-900">{r.description}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(r.occurredAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
