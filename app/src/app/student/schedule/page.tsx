'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

const DAYS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

type ScheduleEntry = { id: string; dayOfWeek: number; startTime: string; endTime: string; room: string | null; subjectName: string; sectionName: string; teacherName: string };

export default function StudentSchedulePage() {
  const { message } = App.useApp();
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { getStudentSchedule } = await import('@/actions/studentQueries');
        const data = await getStudentSchedule();
        setSchedules(data as ScheduleEntry[]);
      } catch (e: any) {
        message.error(e.message || 'Error cargando horario');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const byDay = [1,2,3,4,5].map(d => ({
    day: DAYS[d],
    entries: schedules.filter(s => s.dayOfWeek === d).sort((a, b) => a.startTime.localeCompare(b.startTime)),
  }));

  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={menuGroups} breadcrumbs={['Alumno', 'Horarios']}>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mi Horario</h1>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">{schedules.length} clases</span>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>
          Cargando...
        </div>
      ) : schedules.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">calendar_month</span>
          <p className="text-gray-500">No hay horario configurado.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {byDay.filter(d => d.entries.length > 0).map(d => (
            <div key={d.day}>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{d.day}</h2>
              <div className="space-y-2">
                {d.entries.map(s => (
                  <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
                    <div className="w-14 text-center">
                      <div className="text-sm font-bold text-gray-900">{s.startTime}</div>
                      <div className="text-xs text-gray-400">{s.endTime}</div>
                    </div>
                    <div className="w-px h-10 bg-gray-200" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{s.subjectName}</div>
                      <div className="text-sm text-gray-500">{s.teacherName}</div>
                    </div>
                    {s.room && <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg">{s.room}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
