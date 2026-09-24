'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getIntegrationsStatus,
  getGoogleClassroomConnectUrl,
  disconnectGoogleClassroom,
  listGoogleClassroomCourses,
  type IntegrationStatus,
  type ClassroomCourseRow,
} from '@/actions/integrations';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

function IntegrationsPageInner() {
  const { message } = App.useApp();
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<ClassroomCourseRow[] | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setIntegrations(await getIntegrationsStatus());
    } catch (e: any) {
      message.error(e.message || 'Error al cargar integraciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');
    if (connected) message.success('Conectado exitosamente');
    if (error) message.error(`Error al conectar: ${error}`);
  }, []);

  const handleConnect = async () => {
    const res = await getGoogleClassroomConnectUrl();
    if ('error' in res) {
      message.error(res.error);
      return;
    }
    window.location.href = res.url;
  };

  const handleDisconnect = async () => {
    await disconnectGoogleClassroom();
    message.success('Desconectado');
    setCourses(null);
    load();
  };

  const handleListCourses = async () => {
    const res = await listGoogleClassroomCourses();
    if ('error' in res) {
      message.error(res.error);
      return;
    }
    setCourses(res);
  };

  const classroom = integrations.find((i) => i.provider === 'google_classroom');
  const sisEstatal = integrations.find((i) => i.provider === 'sis_estatal');

  return (
    <DashboardLayout roleTitle="Admin / Control Escolar" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'Integraciones']}>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Integraciones Externas</h1>

      {loading ? (
        <div className="py-12 text-center text-gray-500">Cargando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl">
          {classroom && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">{classroom.label}</h3>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${classroom.connected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                  {classroom.connected ? 'Conectado' : 'Desconectado'}
                </span>
              </div>
              {classroom.connected ? (
                <>
                  <p className="text-sm text-gray-600 mb-4">Cuenta: {classroom.accountEmail}</p>
                  <div className="flex gap-2 mb-4">
                    <button onClick={handleListCourses} className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm">Ver cursos</button>
                    <button onClick={handleDisconnect} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm">Desconectar</button>
                  </div>
                  {courses && (
                    <div className="space-y-1">
                      {courses.map((c) => (
                        <div key={c.id} className="text-sm bg-gray-50 rounded-lg px-3 py-2">{c.name}</div>
                      ))}
                      {courses.length === 0 && <p className="text-xs text-gray-400">Sin cursos en esta cuenta.</p>}
                    </div>
                  )}
                </>
              ) : classroom.available ? (
                <button onClick={handleConnect} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800">
                  Conectar con Google
                </button>
              ) : (
                <p className="text-sm text-amber-600">{classroom.unavailableReason}</p>
              )}
            </div>
          )}

          {sisEstatal && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 opacity-70">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">{sisEstatal.label}</h3>
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600">No disponible</span>
              </div>
              <p className="text-sm text-gray-500">{sisEstatal.unavailableReason}</p>
            </div>
          )}
        </div>
      )}
    </DashboardLayout>
  );
}

export default function IntegrationsPage() {
  return (
    <React.Suspense fallback={null}>
      <IntegrationsPageInner />
    </React.Suspense>
  );
}
