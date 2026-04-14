'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { message } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

type Grade = { id: string; score: number; maxScore: number; evaluationName: string; type: string; subjectName: string; date: string };
const TYPE_LABELS: Record<string, string> = { exam: 'Examen', quiz: 'Quiz', homework: 'Tarea', project: 'Proyecto', participation: 'Participación' };

export default function StudentReportsPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { getStudentGrades } = await import('@/actions/studentQueries');
        const data = await getStudentGrades();
        setGrades(data as Grade[]);
      } catch (e: any) {
        message.error(e.message || 'Error cargando reportes');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const bySubject = grades.reduce((acc, g) => {
    if (!acc[g.subjectName]) acc[g.subjectName] = [];
    acc[g.subjectName].push(g);
    return acc;
  }, {} as Record<string, Grade[]>);

  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={menuGroups} breadcrumbs={['Alumno', 'Reportes']}>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Boleta de Calificaciones</h1>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400"><span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>Cargando...</div>
      ) : grades.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">description</span>
          <p className="text-gray-500">No hay calificaciones registradas.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(bySubject).sort(([a], [b]) => a.localeCompare(b)).map(([subject, gs]) => {
            const avg = Math.round(gs.reduce((s, g) => s + (g.score / g.maxScore * 10), 0) / gs.length * 10) / 10;
            return (
              <div key={subject} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">{subject}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Promedio:</span>
                    <span className={`text-lg font-bold ${avg >= 7 ? 'text-green-600' : 'text-amber-600'}`}>{avg}</span>
                  </div>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 text-gray-500 font-medium">Evaluación</th>
                      <th className="text-left py-2 text-gray-500 font-medium">Tipo</th>
                      <th className="text-right py-2 text-gray-500 font-medium">Calificación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gs.map(g => (
                      <tr key={g.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 text-gray-900">{g.evaluationName}</td>
                        <td className="py-2 text-gray-500">{TYPE_LABELS[g.type] || g.type}</td>
                        <td className="py-2 text-right font-semibold text-gray-900">{g.score}/{g.maxScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
