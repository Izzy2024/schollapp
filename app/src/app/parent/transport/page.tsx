'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getParentDashboardData } from '@/actions/parent';
import { getStudentTransportInfo, type StudentTransportInfo } from '@/actions/transport';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['parent']);

export default function ParentTransportPage() {
  const { message } = App.useApp();
  const [children, setChildren] = useState<{ id: string; name: string }[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [info, setInfo] = useState<StudentTransportInfo>(null);
  const [loading, setLoading] = useState(true);

  const loadInfo = async (childId: string) => {
    if (!childId) return;
    setLoading(true);
    try {
      setInfo(await getStudentTransportInfo(childId));
    } catch (e: any) {
      message.error(e.message || 'Error al cargar transporte');
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
      if (firstChild) await loadInfo(firstChild);
      else setLoading(false);
    })();
  }, []);

  return (
    <DashboardLayout roleTitle="Portal de Padres" userName="Familia" userRole="Padre/Tutor" menuGroups={menuGroups} breadcrumbs={['Familia', 'Transporte']}>
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Transporte Escolar</h1>
        {children.length > 0 && (
          <select
            value={selectedChildId}
            onChange={(e) => {
              setSelectedChildId(e.target.value);
              loadInfo(e.target.value);
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
      ) : !info ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">directions_bus</span>
          <p className="text-gray-500">No está asignado a ninguna ruta de transporte.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 max-w-lg space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-500">Ruta</p>
            <p className="text-lg font-bold text-gray-900">{info.routeName}</p>
          </div>
          {info.driverName && (
            <div>
              <p className="text-sm font-medium text-gray-500">Conductor</p>
              <p className="text-base text-gray-900">{info.driverName}</p>
            </div>
          )}
          {info.vehiclePlate && (
            <div>
              <p className="text-sm font-medium text-gray-500">Placa del vehículo</p>
              <p className="text-base text-gray-900 font-mono">{info.vehiclePlate}</p>
            </div>
          )}
          {info.stopName && (
            <div>
              <p className="text-sm font-medium text-gray-500">Parada</p>
              <p className="text-base text-gray-900">{info.stopName}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-500">Recogida</p>
              <p className="text-base text-gray-900">{info.pickupTime || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Entrega</p>
              <p className="text-base text-gray-900">{info.dropoffTime || '—'}</p>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
