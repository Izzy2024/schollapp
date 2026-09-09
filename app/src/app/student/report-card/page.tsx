'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getCurrentStudent } from '@/actions/studentQueries';
import { getTermsForTenant, getMyReportCard, type ReportCard } from '@/actions/reportCards';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

export default function StudentReportCardPage() {
  const { message } = App.useApp();
  const [studentId, setStudentId] = useState<string | null>(null);
  const [terms, setTerms] = useState<{ id: string; name: string }[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [reportCard, setReportCard] = useState<ReportCard | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReportCard = async (termId: string) => {
    setLoading(true);
    try {
      const data = await getMyReportCard(termId);
      setReportCard(data);
    } catch (error: any) {
      message.error(error.message || 'Error al cargar la boleta');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const [student, availableTerms] = await Promise.all([getCurrentStudent(), getTermsForTenant()]);
      setStudentId(student?.id ?? null);
      setTerms(availableTerms);
      if (availableTerms.length > 0) {
        const lastTerm = availableTerms[availableTerms.length - 1];
        setSelectedTermId(lastTerm.id);
        await loadReportCard(lastTerm.id);
      } else {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout
      roleTitle="Portal del Estudiante"
      userName="Estudiante"
      userRole="Estudiante"
      menuGroups={menuGroups}
      breadcrumbs={['Alumno', 'Boleta']}
    >
      <div className="flex items-center justify-between mb-8 gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Boleta de Calificaciones</h1>
        <div className="flex items-center gap-3">
          {terms.length > 0 && (
            <select
              value={selectedTermId}
              onChange={(e) => {
                setSelectedTermId(e.target.value);
                loadReportCard(e.target.value);
              }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          {studentId && selectedTermId && (
            <a
              href={`/api/report-cards/${studentId}/${selectedTermId}/pdf`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
              Descargar PDF
            </a>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {loading ? (
          <div className="py-12 text-center text-gray-400">
            <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>
            Cargando boleta...
          </div>
        ) : !reportCard || reportCard.subjects.length === 0 ? (
          <div className="py-10 text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-3 block">school</span>
            <p className="text-gray-500">Sin materias o calificaciones para este período.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50/50 text-gray-600 font-medium border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3">Materia</th>
                    <th className="px-4 py-3">Docente</th>
                    <th className="px-4 py-3">Detalle</th>
                    <th className="px-4 py-3 text-right">Promedio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportCard.subjects.map((s) => (
                    <tr key={s.sectionSubjectId}>
                      <td className="px-4 py-3 font-medium text-gray-900">{s.subjectName}</td>
                      <td className="px-4 py-3 text-gray-600">{s.teacherName}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {s.typeAverages.length > 0
                          ? s.typeAverages.map((t) => `${t.type}: ${t.averagePercent.toFixed(1)}%`).join(', ')
                          : 'Sin notas'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900">
                        {s.finalAveragePercent === null ? '—' : `${s.finalAveragePercent.toFixed(1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <span className="text-base font-bold text-gray-900">Promedio general</span>
              <span className="text-xl font-bold text-indigo-700">
                {reportCard.overallAveragePercent === null ? '—' : `${reportCard.overallAveragePercent.toFixed(1)}%`}
              </span>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
