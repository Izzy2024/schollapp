'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getParentDashboardData } from '@/actions/parent';
import { getTermsForTenant, getStudentReportCard, type ReportCard } from '@/actions/reportCards';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['parent']);

export default function ParentReportCardPage() {
  const { message } = App.useApp();
  const [children, setChildren] = useState<{ id: string; name: string }[]>([]);
  const [selectedChildId, setSelectedChildId] = useState('');
  const [terms, setTerms] = useState<{ id: string; name: string }[]>([]);
  const [selectedTermId, setSelectedTermId] = useState('');
  const [reportCard, setReportCard] = useState<ReportCard | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReportCard = async (childId: string, termId: string) => {
    if (!childId || !termId) return;
    setLoading(true);
    try {
      const data = await getStudentReportCard(childId, termId);
      setReportCard(data);
    } catch (error: any) {
      message.error(error.message || 'Error al cargar la boleta');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const [dashboard, availableTerms] = await Promise.all([getParentDashboardData(), getTermsForTenant()]);
      const childOptions = dashboard.children.map((c: any) => ({ id: c.id, name: c.name }));
      setChildren(childOptions);
      setTerms(availableTerms);

      const firstChild = childOptions[0]?.id ?? '';
      const lastTerm = availableTerms[availableTerms.length - 1]?.id ?? '';
      setSelectedChildId(firstChild);
      setSelectedTermId(lastTerm);

      if (firstChild && lastTerm) {
        await loadReportCard(firstChild, lastTerm);
      } else {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout
      roleTitle="Portal de Padres"
      userName="Familia"
      userRole="Padre/Tutor"
      menuGroups={menuGroups}
      breadcrumbs={['Familia', 'Boleta']}
    >
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Boleta de Calificaciones</h1>
        <div className="flex items-center gap-3">
          {children.length > 0 && (
            <select
              value={selectedChildId}
              onChange={(e) => {
                setSelectedChildId(e.target.value);
                loadReportCard(e.target.value, selectedTermId);
              }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {children.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          {terms.length > 0 && (
            <select
              value={selectedTermId}
              onChange={(e) => {
                setSelectedTermId(e.target.value);
                loadReportCard(selectedChildId, e.target.value);
              }}
              className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {terms.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
          {selectedChildId && selectedTermId && (
            <a
              href={`/api/report-cards/${selectedChildId}/${selectedTermId}/pdf`}
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
        ) : children.length === 0 ? (
          <div className="py-10 text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl">
            <span className="material-symbols-outlined text-4xl text-gray-300 mb-3 block">family_restroom</span>
            <p className="text-gray-500">No hay estudiantes vinculados a tu cuenta.</p>
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
