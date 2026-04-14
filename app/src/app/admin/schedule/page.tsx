'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { message } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

type ScheduleEntry = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  subjectName: string;
  sectionName: string;
  teacherName: string;
};

const DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function AdminSchedulePage() {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        // Admin sees all schedules via Prisma query through a server action
        // For now, reuse the existing scheduleRequests action to get data
        const prisma = (await import('@/lib/prisma')).default;
        // We can't use prisma directly from client, so we'll show schedule requests + link
        // Actually, we need to query ClassSchedule - let's use the schedule page approach
        // Import adminClasses to get sectionSubjects
        const { getSectionSubjects } = await import('@/actions/adminClasses');
        const sectionSubjects = await getSectionSubjects();

        // Build schedule entries from ClassSchedule
        const entries: ScheduleEntry[] = [];
        for (const ss of sectionSubjects as any[]) {
          if (ss.schedules && ss.schedules.length > 0) {
            for (const s of ss.schedules) {
              entries.push({
                id: s.id,
                dayOfWeek: s.dayOfWeek,
                startTime: s.startTime,
                endTime: s.endTime,
                room: s.room,
                subjectName: ss.subjectName || ss.subject?.name || '',
                sectionName: ss.sectionName || `${ss.section?.gradeLevel?.name || ''} ${ss.section?.name || ''}`,
                teacherName: ss.teacherName || ss.staff?.fullName || 'Sin asignar',
              });
            }
          }
        }
        setSchedules(entries);
      } catch (e: any) {
        message.error(e.message || 'Error cargando horarios');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = selectedDay !== null ? schedules.filter(s => s.dayOfWeek === selectedDay) : schedules;
  const grouped = filtered.reduce((acc, s) => {
    const day = DAYS[s.dayOfWeek] || 'Sin día';
    if (!acc[day]) acc[day] = [];
    acc[day].push(s);
    return acc;
  }, {} as Record<string, ScheduleEntry[]>);

  // Sort entries within each day by startTime
  Object.values(grouped).forEach(entries => entries.sort((a, b) => a.startTime.localeCompare(b.startTime)));

  return (
    <DashboardLayout roleTitle="Admin" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'Horarios']}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Horarios</h1>
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">{schedules.length} clases</span>
        </div>
        <a href="/admin/schedule-requests" className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-lg">
          <span className="material-symbols-outlined text-lg">swap_horiz</span>
          Solicitudes de Horario
        </a>
      </div>

      {/* Day filter */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto">
        <button onClick={() => setSelectedDay(null)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${selectedDay === null ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>Todos</button>
        {[1,2,3,4,5].map(d => (
          <button key={d} onClick={() => setSelectedDay(selectedDay === d ? null : d)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${selectedDay === d ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>{DAYS_SHORT[d]}</button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>
          Cargando horarios...
        </div>
      ) : schedules.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">calendar_month</span>
          <p className="text-gray-500 mb-2">No hay horarios configurados.</p>
          <p className="text-sm text-gray-400">Los horarios se asignan cuando se aprueban solicitudes de horario.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).sort(([a], [b]) => {
            const ai = DAYS.indexOf(a); const bi = DAYS.indexOf(b); return ai - bi;
          }).map(([day, entries]) => (
            <div key={day}>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{day}</h2>
              <div className="space-y-2">
                {entries.map(s => (
                  <div key={s.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:border-gray-300 transition-all">
                    <div className="w-14 text-center">
                      <div className="text-sm font-bold text-gray-900">{s.startTime}</div>
                      <div className="text-xs text-gray-400">{s.endTime}</div>
                    </div>
                    <div className="w-px h-10 bg-gray-200" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900">{s.subjectName}</div>
                      <div className="text-sm text-gray-500">{s.sectionName} • {s.teacherName}</div>
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
