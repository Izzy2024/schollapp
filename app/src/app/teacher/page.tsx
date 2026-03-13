'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getTeacherDashboardData } from '@/actions/teacher';
import ClassRequestModal from '@/components/ClassRequestModal';
import { useRouter } from 'next/navigation';
import { TEACHER_MENU_GROUPS } from '@/lib/teacherMenu';

export default function TeacherDashboard() {
  const [data, setData] = useState<{
    teacherName: string;
    teacherRole: string;
    classes: {
      id: string;
      subject: string;
      subjectColor: string;
      name: string;
      grade: string;
      students: number;
      borderColor: string;
      nextLesson: string;
      topic: string;
      pending?: number;
      allCaughtUp: boolean;
    }[];
    totalStudents: number;
    pendingGrades: number;
    todaySessions: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getTeacherDashboardData('school-demo')
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalClasses = data?.classes?.length || 0;
  const totalStudents = data?.totalStudents || 0;
  const pendingGrades = data?.pendingGrades || 0;
  const todaySessions = data?.todaySessions || 0;

  return (
    <DashboardLayout
      roleTitle="Appsschool"
      userName={data?.teacherName || "Cargando..."}
      userRole={data?.teacherRole || "Docente"}
      menuGroups={TEACHER_MENU_GROUPS}
      breadcrumbs={['Docentes', 'Mis Clases']}
      headerAction={
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors shadow-lg">
          <span className="material-symbols-outlined text-lg">add</span>
          Nueva Clase
        </button>
      }
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Clases</h1>
          <p className="text-sm text-gray-500">Resumen de tus asignaciones actuales</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-lg">tune</span>Filtrar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-lg">sort</span>Ordenar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 mt-6">
        <div className="stat-card flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <span className="material-symbols-outlined text-2xl">school</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{loading ? '-' : totalClasses}</p>
            <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Total Clases</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <span className="material-symbols-outlined text-2xl">groups</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{loading ? '-' : totalStudents}</p>
            <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Total Alumnos</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <span className="material-symbols-outlined text-2xl">grading</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{loading ? '-' : pendingGrades}</p>
            <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Calif. Pendientes</p>
          </div>
        </div>
        <div className="stat-card flex items-center gap-4">
          <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
            <span className="material-symbols-outlined text-2xl">event</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{loading ? '-' : todaySessions}</p>
            <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">Sesiones Hoy</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {!loading && data?.classes && data.classes.length > 0 ? (
          data.classes.map((cls, i: number) => (
            <div 
              key={cls.id || i}
              onClick={() => router.push(`/teacher/classes/${cls.id}`)}
              className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer border-b-4 ${cls.borderColor}`}
            >
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cls.subjectColor}`}>
                    {cls.subject}
                  </span>
                  <button className="text-gray-400 hover:text-gray-600" onClick={e => e.stopPropagation()}>
                    <span className="material-symbols-outlined text-lg">more_horiz</span>
                  </button>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight">{cls.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{cls.grade}</p>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex -space-x-2">
                    {[...Array(Math.min(3, cls.students))].map((_, j) => (
                      <div key={j} className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm ${['bg-amber-400', 'bg-emerald-400', 'bg-blue-400'][j]}`}>
                        {String.fromCharCode(65 + j)}
                      </div>
                    ))}
                    {cls.students > 0 && <div className="w-7 h-7 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500 shadow-sm">+{Math.max(0, cls.students - 3)}</div>}
                    {cls.students === 0 && <span className="text-xs text-gray-400">Sin alumnos</span>}
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/50">
                <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium mb-1.5">
                  <span className="material-symbols-outlined text-[15px]">{cls.nextLesson.includes('Hoy') ? 'schedule' : 'event'}</span>
                  {cls.nextLesson}
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-xs text-gray-500 truncate mr-2" title={cls.topic}>{cls.topic}</span>
                  {cls.pending && <span className="text-[10px] bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded-full whitespace-nowrap">● {cls.pending} Pendientes</span>}
                  {cls.allCaughtUp && <span className="text-[10px] text-emerald-600 font-bold px-2 py-0.5 rounded-full whitespace-nowrap">✓ Al día</span>}
                </div>
              </div>
            </div>
          ))
        ) : (
          !loading && <div className="col-span-full py-12 text-center text-gray-500">No tienes clases asignadas.</div>
        )}
        
        {/* Create New Class Card */}
        <div 
          onClick={() => setModalOpen(true)}
          className="bg-white rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center p-8 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer min-h-[220px] group"
        >
          <div className="w-12 h-12 text-gray-300 mb-3 flex items-center justify-center group-hover:text-indigo-400 transition-colors">
            <span className="material-symbols-outlined text-4xl">add</span>
          </div>
          <h3 className="text-base font-semibold text-gray-700 mb-1 group-hover:text-indigo-700 transition-colors">Crear Nueva Clase</h3>
          <p className="text-xs text-gray-400 text-center px-4">Solicita una nueva asignación al director</p>
        </div>
      </div>

      <ClassRequestModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </DashboardLayout>
  );
}
