'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getCurrentStudent } from '@/actions/studentQueries';
import { getStudentTransportInfo, type StudentTransportInfo } from '@/actions/transport';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

export default function StudentTransportPage() {
  const { message } = App.useApp();
  const [info, setInfo] = useState<StudentTransportInfo>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const student = await getCurrentStudent();
        if (!student) return;
        setInfo(await getStudentTransportInfo(student.id));
      } catch (e: any) {
        message.error(e.message || 'Error al cargar transporte');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={menuGroups} breadcrumbs={['Alumno', 'Transporte']}>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Transporte Escolar</h1>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Cargando...</div>
      ) : !info ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">directions_bus</span>
          <p className="text-gray-500">No estás asignado a ninguna ruta de transporte.</p>
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
