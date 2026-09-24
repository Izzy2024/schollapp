'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

const TYPE_COLORS: Record<string, string> = {
  exam: 'bg-red-100 text-red-800', quiz: 'bg-blue-100 text-blue-800',
  homework: 'bg-amber-100 text-amber-800', project: 'bg-purple-100 text-purple-800',
  participation: 'bg-green-100 text-green-800',
};
const TYPE_LABELS: Record<string, string> = { exam: 'Examen', quiz: 'Quiz', homework: 'Tarea', project: 'Proyecto', participation: 'Participación' };

type Exam = { id: string; name: string; type: string; date: string; maxScore: number; subjectName: string; teacherName: string; score: number | null };

export default function StudentExamsPage() {
  const { message } = App.useApp();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    (async () => {
      try {
        const { getStudentExams } = await import('@/actions/studentQueries');
        const data = await getStudentExams();
        setExams(data as Exam[]);
      } catch (e: any) {
        message.error(e.message || 'Error cargando exámenes');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = filter === 'all' ? exams : exams.filter(e => e.type === filter);
  const upcoming = exams.filter(e => new Date(e.date) >= new Date());
  const types = Array.from(new Set(exams.map(e => e.type)));

  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={menuGroups} breadcrumbs={['Alumno', 'Exámenes']}>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Exámenes y Evaluaciones</h1>
        {upcoming.length > 0 && <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-bold">{upcoming.length} próximas</span>}
      </div>

      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${filter === 'all' ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>Todas</button>
        {types.map(t => <button key={t} onClick={() => setFilter(t)} className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize ${filter === t ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}>{TYPE_LABELS[t] || t}</button>)}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400"><span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>Cargando...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">quiz</span>
          <p className="text-gray-500">No hay evaluaciones.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ev => (
            <div key={ev.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-gray-300 transition-all">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${TYPE_COLORS[ev.type]?.replace('text-', 'text-').replace('bg-', 'bg-') || 'bg-gray-100 text-gray-600'}`} style={{ background: ev.type === 'exam' ? '#fef2f2' : ev.type === 'quiz' ? '#eff6ff' : ev.type === 'homework' ? '#fffbeb' : '#f3f4f6' }}>
                    <span className="material-symbols-outlined text-lg">{ev.type === 'exam' ? 'quiz' : ev.type === 'homework' ? 'assignment' : 'assignment_turned_in'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900">{ev.name}</h3>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${TYPE_COLORS[ev.type] || 'bg-gray-100 text-gray-700'}`}>{TYPE_LABELS[ev.type] || ev.type}</span>
                    </div>
                    <p className="text-sm text-gray-500">{ev.subjectName} • {ev.teacherName}</p>
                    <div className="text-xs text-gray-400 mt-1">{new Date(ev.date).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} • Máx: {ev.maxScore} pts</div>
                  </div>
                </div>
                {ev.score !== null && (
                  <div className="text-center flex-shrink-0 bg-gray-50 rounded-xl px-4 py-2">
                    <div className="text-2xl font-bold text-gray-900">{ev.score}</div>
                    <div className="text-xs text-gray-400">de {ev.maxScore}</div>
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
