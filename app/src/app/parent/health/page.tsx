'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getParentDashboardData } from '@/actions/parent';
import { getHealthRecord, getHealthIncidents, type HealthRecordData, type HealthIncidentRow } from '@/actions/health';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['parent']);

export default function ParentHealthPage() {
  const { message } = App.useApp();
  const [children, setChildren] = useState<{ id: string; name: string }[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [record, setRecord] = useState<HealthRecordData | null>(null);
  const [incidents, setIncidents] = useState<HealthIncidentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHealth = async (childId: string) => {
    if (!childId) return;
    setLoading(true);
    try {
      const [r, i] = await Promise.all([getHealthRecord(childId), getHealthIncidents(childId)]);
      setRecord(r);
      setIncidents(i);
    } catch (e: any) {
      message.error(e.message || 'Error al cargar salud');
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
      if (firstChild) await loadHealth(firstChild);
      else setLoading(false);
    })();
  }, []);

  return (
    <DashboardLayout roleTitle="Portal de Padres" userName="Familia" userRole="Padre/Tutor" menuGroups={menuGroups} breadcrumbs={['Familia', 'Salud']}>
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Salud</h1>
        {children.length > 0 && (
          <select
            value={selectedChildId}
            onChange={(e) => {
              setSelectedChildId(e.target.value);
              loadHealth(e.target.value);
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
      ) : (
        <div className="space-y-6 max-w-2xl">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">Expediente Médico</h3>
            {!record ? (
              <p className="text-sm text-gray-400">Sin expediente médico registrado.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="font-medium text-gray-500">Tipo de sangre</p><p className="text-gray-900">{record.bloodType || '—'}</p></div>
                <div><p className="font-medium text-gray-500">Alergias</p><p className="text-gray-900">{record.allergies || '—'}</p></div>
                <div><p className="font-medium text-gray-500">Condiciones crónicas</p><p className="text-gray-900">{record.chronicConditions || '—'}</p></div>
                <div><p className="font-medium text-gray-500">Medicamentos</p><p className="text-gray-900">{record.medications || '—'}</p></div>
                <div><p className="font-medium text-gray-500">Contacto de emergencia</p><p className="text-gray-900">{record.emergencyContactName || '—'}</p></div>
                <div><p className="font-medium text-gray-500">Teléfono</p><p className="text-gray-900">{record.emergencyContactPhone || '—'}</p></div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="font-bold text-gray-900 mb-4">Incidentes de Salud</h3>
            {incidents.length === 0 ? (
              <p className="text-sm text-gray-400">Sin incidentes registrados.</p>
            ) : (
              <div className="space-y-3">
                {incidents.map((i) => (
                  <div key={i.id} className="border-b border-gray-50 pb-3 last:border-0">
                    <p className="text-sm text-gray-900">{i.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(i.occurredAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
