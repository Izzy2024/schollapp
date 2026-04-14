'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { message } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

type Evaluation = {
  id: string;
  name: string;
  type: string;
  date: string;
  maxScore: number;
  subjectName: string;
  sectionName: string;
  teacherName: string;
  recordsCount: number;
  avgScore: number | null;
};

export default function AdminAssignmentsPage() {
  const [assignments, setAssignments] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { getSectionSubjects } = await import('@/actions/adminClasses');
        const sectionSubjects = await getSectionSubjects();

        const homeworks: Evaluation[] = [];
        for (const ss of sectionSubjects as any[]) {
          if (ss.evaluations && ss.evaluations.length > 0) {
            for (const ev of ss.evaluations) {
              if (ev.type === 'homework') {
                const scores = ev.records?.map((r: any) => r.score).filter((s: number) => s !== null) || [];
                const avg = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : null;
                homeworks.push({
                  id: ev.id, name: ev.name, type: ev.type, date: ev.date, maxScore: ev.maxScore,
                  subjectName: ss.subjectName || ss.subject?.name || '',
                  sectionName: ss.sectionName || `${ss.section?.gradeLevel?.name || ''} ${ss.section?.name || ''}`,
                  teacherName: ss.teacherName || ss.staff?.fullName || '',
                  recordsCount: ev.records?.length || 0, avgScore: avg,
                });
              }
            }
          }
        }
        homeworks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setAssignments(homeworks);
      } catch (e: any) {
        message.error(e.message || 'Error cargando tareas');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout roleTitle="Admin" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'Gestión de Tareas']}>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Tareas</h1>
        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-bold">{assignments.length} tareas</span>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>
          Cargando tareas...
        </div>
      ) : assignments.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">assignment</span>
          <p className="text-gray-500 mb-2">No hay tareas registradas.</p>
          <p className="text-sm text-gray-400">Los docentes pueden crear tareas desde su sección de Calificaciones.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(hw => (
            <div key={hw.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-gray-300 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-lg">assignment</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900">{hw.name}</h3>
                    <p className="text-sm text-gray-500">{hw.subjectName} • {hw.sectionName} • {hw.teacherName}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>Fecha: {new Date(hw.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
                      <span>&bull;</span>
                      <span>Máx: {hw.maxScore} pts</span>
                      <span>&bull;</span>
                      <span>{hw.recordsCount} entregas</span>
                    </div>
                  </div>
                </div>
                {hw.avgScore !== null && (
                  <div className="text-center flex-shrink-0">
                    <div className="text-2xl font-bold text-gray-900">{hw.avgScore}</div>
                    <div className="text-xs text-gray-400">Promedio</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
