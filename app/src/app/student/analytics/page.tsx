'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

type Grade = { id: string; score: number; maxScore: number; evaluationName: string; type: string; subjectName: string; date: string };

const TYPE_LABELS: Record<string, string> = { exam: 'Examen', quiz: 'Quiz', homework: 'Tarea', project: 'Proyecto', participation: 'Participación' };

export default function StudentAnalyticsPage() {
  const { message } = App.useApp();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { getStudentGrades } = await import('@/actions/studentQueries');
        const data = await getStudentGrades();
        setGrades(data as Grade[]);
      } catch (e: any) {
        message.error(e.message || 'Error cargando calificaciones');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const avgScore = grades.length > 0 ? Math.round(grades.reduce((s, g) => s + (g.score / g.maxScore * 10), 0) / grades.length * 10) / 10 : null;
  const bySubject = grades.reduce((acc, g) => {
    if (!acc[g.subjectName]) acc[g.subjectName] = [];
    acc[g.subjectName].push(g);
    return acc;
  }, {} as Record<string, Grade[]>);

  const subjectAvgs = Object.entries(bySubject).map(([name, gs]) => {
    const avg = gs.reduce((s, g) => s + (g.score / g.maxScore * 10), 0) / gs.length;
    return { name, avg: Math.round(avg * 10) / 10, count: gs.length };
  }).sort((a, b) => b.avg - a.avg);

  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={menuGroups} breadcrumbs={['Alumno', 'Analítica']}>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Mi Progreso</h1>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400"><span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>Cargando...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {[
              { label: 'Promedio General', value: avgScore !== null ? `${avgScore}` : '—', icon: 'grade', color: avgScore !== null && avgScore >= 7 ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600', sub: 'de 10' },
              { label: 'Evaluaciones', value: grades.length.toString(), icon: 'quiz', color: 'bg-blue-50 text-blue-600' },
              { label: 'Materias', value: Object.keys(bySubject).length.toString(), icon: 'school', color: 'bg-violet-50 text-violet-600' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className={`p-3 rounded-xl ${kpi.color}`}><span className="material-symbols-outlined text-2xl">{kpi.icon}</span></div>
                <div>
                  <div className="text-sm font-medium text-gray-500">{kpi.label}</div>
                  <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
                  {kpi.sub && <div className="text-xs text-gray-400">{kpi.sub}</div>}
                </div>
              </div>
            ))}
          </div>

          {/* Subject bars */}
          {subjectAvgs.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Promedio por Materia</h2>
              <div className="space-y-4">
                {subjectAvgs.map(s => (
                  <div key={s.name} className="flex items-center gap-4">
                    <div className="w-36 text-sm font-medium text-gray-700 truncate">{s.name}</div>
                    <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${s.avg >= 8 ? 'bg-green-500' : s.avg >= 6 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s.avg * 10}%` }} />
                    </div>
                    <span className="text-sm font-bold text-gray-900 w-10 text-right">{s.avg}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent grades */}
          {grades.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Calificaciones Recientes</h2>
              <div className="space-y-2">
                {grades.slice(0, 15).map(g => (
                  <div key={g.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-900">{g.evaluationName}</span>
                      <span className="text-xs text-gray-400">{g.subjectName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{g.score}/{g.maxScore}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${(g.score / g.maxScore) >= 0.7 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {Math.round(g.score / g.maxScore * 10 * 10) / 10}
                      </span>
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
