'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { TEACHER_MENU_GROUPS } from '@/lib/teacherMenu';
import { useRouter } from 'next/navigation';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const TIME_SLOTS = [
  '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
  '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00'
];

const timeToMinutes = (t: string) => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

type ScheduleEvent = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string | null;
  subjectName: string;
  sectionName: string;
  sectionSubjectId: string;
};

// Colors mapping just to make it look nice based on subject name
const getSubjectColor = (name: string) => {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = [
    'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
    'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
    'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
    'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
    'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
  ];
  return colors[hash % colors.length];
};

export default function ScheduleClient({ schedule }: { schedule: ScheduleEvent[] }) {
  const router = useRouter();
  
  const getEventsForSlot = (dayIdx: number, slotTime: string) => {
    return schedule.filter(e => {
      const slotMin = timeToMinutes(slotTime);
      const startMin = timeToMinutes(e.startTime);
      const endMin = timeToMinutes(e.endTime);
      return e.dayOfWeek === dayIdx + 1 && slotMin >= startMin && slotMin < endMin;
    });
  };

  return (
    <DashboardLayout
      roleTitle="Appsschool"
      userName="Prof. García"
      userRole="Docente Senior"
      menuGroups={TEACHER_MENU_GROUPS}
      breadcrumbs={['Docentes', 'Horario']}
    >
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col h-full min-h-[700px] mt-[2px]">
        
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/20">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Horario Semanal</h1>
            <p className="text-sm text-gray-500 font-medium">Visualiza tus clases asignadas de lunes a viernes</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
              <span className="material-symbols-outlined text-[20px]">chevron_left</span>
            </button>
            <span className="text-sm font-bold text-gray-900 mx-2">Semana Actual</span>
            <button className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors">
              <span className="material-symbols-outlined text-[20px]">chevron_right</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto p-6">
          <div className="min-w-[800px] border border-gray-100 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-6 border-b border-gray-100 bg-gray-50/80">
              <div className="p-4 flex items-center justify-center border-r border-gray-100">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Hora</span>
              </div>
              {DAYS.map((day) => (
                <div key={day} className="p-4 flex items-center justify-center border-r border-gray-100 last:border-0">
                  <span className="text-[13px] font-bold text-gray-900 uppercase tracking-widest">{day}</span>
                </div>
              ))}
            </div>
            
            <div className="divide-y divide-gray-100">
              {TIME_SLOTS.map((slot) => (
                <div key={slot} className="grid grid-cols-6 group hover:bg-gray-50/30 transition-colors">
                  <div className="p-4 border-r border-gray-100 flex items-center justify-center">
                    <span className="text-[13px] font-bold text-gray-500">{slot}</span>
                  </div>
                  
                  {DAYS.map((_, dayIdx) => {
                    const events = getEventsForSlot(dayIdx, slot);
                    
                    return (
                      <div key={dayIdx} className="p-2 border-r border-gray-100 last:border-0 min-h-[100px] flex flex-col gap-2">
                        {events.length === 0 && (
                          <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-200"></span>
                          </div>
                        )}
                        {events.map(ev => {
                          const colorClass = getSubjectColor(ev.subjectName);
                          return (
                            <div 
                              key={ev.id} 
                              onClick={() => router.push(`/teacher/classes/${ev.sectionSubjectId}`)}
                              className={`p-3 rounded-xl border flex flex-col gap-1 cursor-pointer transition-colors shadow-sm ${colorClass}`}
                            >
                              <span className="text-[11px] font-black uppercase tracking-wider opacity-80">{ev.startTime} - {ev.endTime}</span>
                              <h3 className="text-[13px] font-bold leading-tight">{ev.subjectName}</h3>
                              <p className="text-[11px] font-semibold opacity-90">{ev.sectionName}</p>
                              {ev.room && (
                                <div className="flex items-center gap-1 mt-1 opacity-70">
                                  <span className="material-symbols-outlined text-[12px]">meeting_room</span>
                                  <span className="text-[10px] font-bold">{ev.room}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
