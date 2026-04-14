'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { message } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

type Activity = {
  id: string;
  actorName: string;
  display: { icon: string; iconColor: string; iconBg: string; text: string };
  occurredAt: string;
  entityType: string;
};

export default function AdminActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  useEffect(() => {
    (async () => {
      try {
        const { getRecentActivities } = await import('@/actions/activity');
        const result = await getRecentActivities(undefined, filter, page, 30);
        setActivities(result.activities as Activity[]);
      } catch (e: any) {
        message.error(e.message || 'Error cargando actividades');
      } finally {
        setLoading(false);
      }
    })();
  }, [filter, page]);

  const entityTypes = ['enrollment', 'announcement', 'attendance', 'finance'];

  return (
    <DashboardLayout roleTitle="Admin" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'Actividades']}>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Actividades</h1>
        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-bold">Registro de actividad</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => { setFilter(undefined); setPage(1); }} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${!filter ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Todas</button>
        {entityTypes.map(t => (
          <button key={t} onClick={() => { setFilter(t); setPage(1); }} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors capitalize ${filter === t ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{t === 'enrollment' ? 'Inscripciones' : t === 'announcement' ? 'Comunicados' : t === 'attendance' ? 'Asistencia' : 'Finanzas'}</button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>
          Cargando actividades...
        </div>
      ) : activities.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">activity_timeline</span>
          <p className="text-gray-500">No hay actividades registradas.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map(act => (
            <div key={act.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${act.display.iconBg} ${act.display.iconColor}`}>
                <span className="material-symbols-outlined text-lg">{act.display.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{act.display.text}</p>
                <p className="text-xs text-gray-400 mt-0.5">{act.actorName}</p>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">
                {new Date(act.occurredAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {activities.length >= 30 && (
        <div className="flex justify-center mt-6">
          <button onClick={() => setPage(p => p + 1)} className="px-6 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cargar más
          </button>
        </div>
      )}
    </DashboardLayout>
  );
}
