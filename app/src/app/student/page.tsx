'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getStudentDashboardData } from '@/actions/student';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EventCard({ title, time, color }: any) {
  const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-800', icon: 'check_circle' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-800', icon: 'assignment_late' },
    red: { bg: 'bg-red-50', text: 'text-red-800', icon: 'edit' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-800', icon: 'visibility' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-800', icon: 'download' },
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
  const [selectedMonth, setSelectedMonth] = useState(1);

  useEffect(() => {
    getStudentDashboardData('school-demo')
      .then(setData)
      .catch(console.error);
  }, []);

  const studentName = data?.studentInfo?.name || 'Estudiante';

  const activityDays = [
    { day: 1, events: [
      { title: 'Tarea Enviada', time: '6:45 am', color: 'blue' },
      { title: 'Falta a Clase', time: '6:00 am', color: 'orange' },
    ]},
    { day: 2, events: [] },
    { day: 3, events: [
      { title: 'Tarea Editada', time: '6:45 am', color: 'red' },
      { title: 'Lección Vista', time: '6:45 am', color: 'cyan' },
      { title: 'Falta a Clase', time: '6:00 am', color: 'orange' },
    ]},
    { day: 4, events: [], label: 'Fin de semana' },
    { day: 5, events: [], label: 'Fin de semana' },
    { day: 6, events: [
      { title: 'PDF Descargado', time: '6:45 am', color: 'purple' },
      { title: 'Contraseña Cambiada', time: '6:45 am', color: 'cyan' },
    ]},
    { day: 7, events: [] },
    { day: 8, events: [] },
    { day: 9, events: [
      { title: 'Examen Visto', time: '6:45 am', color: 'blue' },
      { title: 'Presente en Clase', time: '6:00 am', color: 'green' },
      { title: 'Sesión en Vivo', time: '6:45 am', color: 'purple' },
      { title: 'Plan de Estudio', time: '6:00 am', color: 'red' },
    ]},
  ];

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
        <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
          <span className="material-symbols-outlined text-lg">chevron_left</span>
        </button>
        <div className="flex-1 flex justify-between px-4 gap-2">
          {months.map((m, i) => (
            <button
              key={m}
              onClick={() => setSelectedMonth(i)}
              className={`px-6 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                i === selectedMonth
                  ? 'text-white bg-gray-900 shadow-lg'
                  : 'text-gray-400 hover:bg-gray-100'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
          <span className="material-symbols-outlined text-lg">chevron_right</span>
        </button>
      </div>

      {/* Activity Calendar Timeline */}
      <div className="space-y-0">
        {activityDays.map((dayItem) => (
          <div key={dayItem.day} className="flex group border-b border-gray-100 py-6 hover:bg-gray-50/50 transition-colors -mx-4 px-4 rounded-xl">
            <div className="w-12 pt-1 flex-shrink-0">
              {dayItem.day === 9 ? (
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
    </DashboardLayout>
  );
}
