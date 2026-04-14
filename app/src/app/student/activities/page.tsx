'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { message } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

type CalEvent = { id: string; title: string; description: string | null; startDate: string; endDate: string | null; type: string | null };

const TYPE_COLORS: Record<string, string> = {
  holiday: 'bg-red-50 text-red-700 border-red-200',
  event: 'bg-blue-50 text-blue-700 border-blue-200',
  deadline: 'bg-amber-50 text-amber-700 border-amber-200',
  exam: 'bg-purple-50 text-purple-700 border-purple-200',
  meeting: 'bg-green-50 text-green-700 border-green-200',
};

export default function StudentActivitiesPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { getStudentCalendarEvents } = await import('@/actions/studentQueries');
        const data = await getStudentCalendarEvents();
        setEvents(data as CalEvent[]);
      } catch (e: any) {
        message.error(e.message || 'Error cargando actividades');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const now = new Date();
  const upcoming = events.filter(e => new Date(e.startDate) >= now);
  const past = events.filter(e => new Date(e.startDate) < now);

  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={menuGroups} breadcrumbs={['Alumno', 'Actividades']}>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Actividades y Eventos</h1>
        {upcoming.length > 0 && <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">{upcoming.length} próximos</span>}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400"><span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>Cargando...</div>
      ) : events.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">event</span>
          <p className="text-gray-500">No hay actividades o eventos programados.</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Próximos</h2>
              <div className="space-y-3">
                {upcoming.map(ev => (
                  <div key={ev.id} className={`rounded-2xl border p-5 ${TYPE_COLORS[ev.type || ''] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <span className="material-symbols-outlined">event</span>
                      </div>
                      <div>
                        <h3 className="font-bold">{ev.title}</h3>
                        {ev.description && <p className="text-sm mt-1 opacity-80">{ev.description}</p>}
                        <div className="text-xs mt-2 opacity-60">
                          {new Date(ev.startDate).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Anteriores</h2>
              <div className="space-y-2">
                {past.slice(0, 10).map(ev => (
                  <div key={ev.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between opacity-70">
                    <div>
                      <span className="font-medium text-gray-700 text-sm">{ev.title}</span>
                      {ev.type && <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">{ev.type}</span>}
                    </div>
                    <span className="text-xs text-gray-400">{new Date(ev.startDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}
