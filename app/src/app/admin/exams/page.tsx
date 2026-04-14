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
};

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  exam: { label: 'Examen', color: 'bg-red-100 text-red-800' },
  quiz: { label: 'Quiz', color: 'bg-blue-100 text-blue-800' },
  homework: { label: 'Tarea', color: 'bg-amber-100 text-amber-800' },
  project: { label: 'Proyecto', color: 'bg-purple-100 text-purple-800' },
  participation: { label: 'Participación', color: 'bg-green-100 text-green-800' },
};

export default function AdminExamsPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    (async () => {
      try {
        // Use a direct query approach — admin sees all evaluations
        const { getSectionSubjects } = await import('@/actions/adminClasses');
        const sectionSubjects = await getSectionSubjects();

        const evals: Evaluation[] = [];
        for (const ss of sectionSubjects as any[]) {
          if (ss.evaluations && ss.evaluations.length > 0) {
            for (const ev of ss.evaluations) {
              evals.push({
                id: ev.id,
                name: ev.name,
                type: ev.type,
                date: ev.date,
                maxScore: ev.maxScore,
                subjectName: ss.subjectName || ss.subject?.name || '',
                sectionName: ss.sectionName || `${ss.section?.gradeLevel?.name || ''} ${ss.section?.name || ''}`,
                teacherName: ss.teacherName || ss.staff?.fullName || '',
                recordsCount: ev.records?.length || 0,
              });
            }
          }
        }
        evals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setEvaluations(evals);
      } catch (e: any) {
        message.error(e.message || 'Error cargando evaluaciones');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = filter === 'all' ? evaluations : evaluations.filter(e => e.type === filter);
  const types = Array.from(new Set(evaluations.map(e => e.type)));

  return (
    <DashboardLayout roleTitle="Admin" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'Exámenes']}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Exámenes y Evaluaciones</h1>
          <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-bold">{evaluations.length} evaluaciones</span>
        </div>
        <a href="/admin/classes" className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-lg">
          <span className="material-symbols-outlined text-lg">edit</span>
          Gestionar Clases
        </a>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto">
        <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Todas</button>
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors capitalize ${filter === t ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>
            {TYPE_LABELS[t]?.label || t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>
          Cargando evaluaciones...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">quiz</span>
          <p className="text-gray-500">No hay evaluaciones registradas.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left py-3 px-5 text-gray-500 font-medium">Evaluación</th>
                <th className="text-left py-3 px-5 text-gray-500 font-medium">Tipo</th>
                <th className="text-left py-3 px-5 text-gray-500 font-medium">Materia / Grupo</th>
                <th className="text-left py-3 px-5 text-gray-500 font-medium">Docente</th>
                <th className="text-center py-3 px-5 text-gray-500 font-medium">Max</th>
                <th className="text-left py-3 px-5 text-gray-500 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ev => (
                <tr key={ev.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-5 font-medium text-gray-900">{ev.name}</td>
                  <td className="py-3 px-5">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${TYPE_LABELS[ev.type]?.color || 'bg-gray-100 text-gray-700'}`}>
                      {TYPE_LABELS[ev.type]?.label || ev.type}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-gray-600">{ev.subjectName} • {ev.sectionName}</td>
                  <td className="py-3 px-5 text-gray-500">{ev.teacherName}</td>
                  <td className="py-3 px-5 text-center font-semibold text-gray-900">{ev.maxScore}</td>
                  <td className="py-3 px-5 text-gray-400">{new Date(ev.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
