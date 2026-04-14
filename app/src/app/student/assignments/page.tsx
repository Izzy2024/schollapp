'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { message } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

type Assignment = { id: string; name: string; type: string; date: string; maxScore: number; subjectName: string; teacherName: string; score: number | null };

export default function StudentAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { getStudentExams } = await import('@/actions/studentQueries');
        const all = await getStudentExams();
        setAssignments((all as Assignment[]).filter(e => e.type === 'homework'));
      } catch (e: any) {
        message.error(e.message || 'Error cargando tareas');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const pending = assignments.filter(a => a.score === null);
  const completed = assignments.filter(a => a.score !== null);

  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={menuGroups} breadcrumbs={['Alumno', 'Tareas']}>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
        {pending.length > 0 && <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-bold">{pending.length} pendientes</span>}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          { label: 'Pendientes', value: pending.length.toString(), icon: 'pending_actions', color: 'bg-amber-50 text-amber-600' },
          { label: 'Entregadas', value: completed.length.toString(), icon: 'task_alt', color: 'bg-green-50 text-green-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${kpi.color}`}><span className="material-symbols-outlined text-xl">{kpi.icon}</span></div>
            <div><div className="text-xs font-medium text-gray-500">{kpi.label}</div><div className="text-xl font-bold text-gray-900">{kpi.value}</div></div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400"><span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>Cargando...</div>
      ) : assignments.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">assignment</span>
          <p className="text-gray-500">No hay tareas asignadas.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="mb-8">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Pendientes</h2>
              <div className="space-y-3">
                {pending.map(a => (
                  <div key={a.id} className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-lg">assignment</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900">{a.name}</h3>
                        <p className="text-sm text-gray-500">{a.subjectName} • {a.teacherName}</p>
                        <p className="text-xs text-gray-400 mt-1">Fecha: {new Date(a.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} • Máx: {a.maxScore} pts</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {completed.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Entregadas</h2>
              <div className="space-y-2">
                {completed.map(a => (
                  <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between">
                    <div>
                      <span className="font-medium text-gray-900 text-sm">{a.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{a.subjectName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{a.score}/{a.maxScore}</span>
                      <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                    </div>
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
