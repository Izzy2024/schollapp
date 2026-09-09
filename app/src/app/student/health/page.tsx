'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getCurrentStudent } from '@/actions/studentQueries';
import { getHealthRecord, getHealthIncidents, type HealthRecordData, type HealthIncidentRow } from '@/actions/health';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

export default function StudentHealthPage() {
  const { message } = App.useApp();
  const [record, setRecord] = useState<HealthRecordData | null>(null);
  const [incidents, setIncidents] = useState<HealthIncidentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const student = await getCurrentStudent();
        if (!student) return;
        const [r, i] = await Promise.all([getHealthRecord(student.id), getHealthIncidents(student.id)]);
        setRecord(r);
        setIncidents(i);
      } catch (e: any) {
        message.error(e.message || 'Error al cargar salud');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={menuGroups} breadcrumbs={['Alumno', 'Salud']}>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Mi Salud</h1>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Cargando...</div>
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
