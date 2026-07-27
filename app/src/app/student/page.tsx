'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getStudentDashboardData, getStudentActivityCalendar } from '@/actions/student';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EventCard({ title, time, color }: any) {
  const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-800', icon: 'check_circle' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-800', icon: 'assignment_late' },
    red: { bg: 'bg-red-50', text: 'text-red-800', icon: 'edit' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-800', icon: 'visibility' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-800', icon: 'grading' },
    green: { bg: 'bg-green-50', text: 'text-green-800', icon: 'check_circle_outline' },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <div className={`event-card ${c.bg}`}>
      <div className={`w-10 h-10 bg-white rounded-xl flex items-center justify-center ${c.text} shadow-sm`}>
        <span className="material-symbols-outlined text-xl">{c.icon}</span>
      </div>
      <div>
        <h4 className={`text-sm font-semibold ${c.text}`}>{title}</h4>
        <p className={`text-xs ${c.text} opacity-70`}>{time}</p>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [activityDays, setActivityDays] = useState<any[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);

  useEffect(() => {
    getStudentDashboardData('school-demo')
      .then(setData)
      .catch(console.error);
  }, []);

  useEffect(() => {
    setLoadingActivity(true);
    getStudentActivityCalendar(year, selectedMonth, 'school-demo')
      .then(setActivityDays)
      .catch(console.error)
      .finally(() => setLoadingActivity(false));
  }, [year, selectedMonth]);

  const studentName = data?.studentInfo?.name || 'Estudiante';

  const goToPrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
  };
  const goToNextMonth = () => {
    if (selectedMonth === 11) { setSelectedMonth(0); setYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
  };

  return (
    <DashboardLayout
      roleTitle="Estudiante"
      userName={studentName}
      userRole="Estudiante"
      menuGroups={menuGroups}
      breadcrumbs={['Estudiantes', 'Actividad']}
    >
      {/* Title */}
      <div className="flex items-center justify-between mb-8 mt-2">
        <h1 className="text-2xl font-bold text-gray-900">Calendario de Actividades</h1>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-lg">tune</span>
            Filtrar
          </button>
          <span className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
        </div>
      </div>

      {/* Month Selector */}
      <div className="flex items-center justify-between mb-8 bg-white p-2 rounded-2xl border border-gray-100">
        <button onClick={goToPrevMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
          <span className="material-symbols-outlined text-lg">chevron_left</span>
        </button>
        <div className="flex-1 flex items-center justify-center gap-3">
          <span className="text-sm font-semibold text-gray-900">{MONTH_NAMES[selectedMonth]} {year}</span>
        </div>
        <button onClick={goToNextMonth} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
          <span className="material-symbols-outlined text-lg">chevron_right</span>
        </button>
      </div>

      {/* Activity Calendar Timeline */}
      {loadingActivity ? (
        <div className="py-16 text-center text-gray-400">Cargando actividad...</div>
      ) : (
        <div className="space-y-0">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {activityDays.map((dayItem: any) => (
            <div key={dayItem.day} className="flex group border-b border-gray-100 py-6 hover:bg-gray-50/50 transition-colors -mx-4 px-4 rounded-xl">
              <div className="w-12 pt-1 flex-shrink-0">
                {dayItem.isToday ? (
                  <span className="w-7 h-7 bg-gray-900 text-white rounded-full flex items-center justify-center font-bold text-xs">{dayItem.day}</span>
                ) : (
                  <span className="text-sm font-medium text-gray-400">{dayItem.day}</span>
                )}
              </div>
              <div className="flex-1">
                {dayItem.events.length > 0 ? (
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {dayItem.events.map((evt: any, ei: number) => (
                      <EventCard key={ei} {...evt} />
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-gray-400 italic">{dayItem.label || 'Sin eventos.'}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
