'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { message } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

type SectionSubjectInfo = {
  id: string;
  subjectName: string;
  sectionName: string;
  teacherName: string;
  unitsCount: number;
  topicsCount: number;
  hasContent: boolean;
};

export default function AdminClassPrepPage() {
  const [classes, setClasses] = useState<SectionSubjectInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { getSectionSubjects } = await import('@/actions/adminClasses');
        const sectionSubjects = await getSectionSubjects();

        const classInfo: SectionSubjectInfo[] = (sectionSubjects as any[]).map(ss => ({
          id: ss.id,
          subjectName: ss.subjectName || ss.subject?.name || '',
          sectionName: ss.sectionName || `${ss.section?.gradeLevel?.name || ''} ${ss.section?.name || ''}`,
          teacherName: ss.teacherName || ss.staff?.fullName || 'Sin asignar',
          unitsCount: ss.curricularUnits?.length || 0,
          topicsCount: ss.curricularUnits?.reduce((sum: number, u: any) => sum + (u.topics?.length || 0), 0) || 0,
          hasContent: (ss.curricularUnits?.length || 0) > 0,
        }));

        setClasses(classInfo);
      } catch (e: any) {
        message.error(e.message || 'Error cargando planeación');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const withContent = classes.filter(c => c.hasContent).length;
  const totalUnits = classes.reduce((s, c) => s + c.unitsCount, 0);
  const totalTopics = classes.reduce((s, c) => s + c.topicsCount, 0);

  return (
    <DashboardLayout roleTitle="Admin" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'Preparación de Clase']}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Preparación de Clase</h1>
          <span className="px-3 py-1 bg-violet-100 text-violet-800 rounded-full text-sm font-bold">{classes.length} clases</span>
        </div>
        <a href="/admin/classes" className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-lg">
          <span className="material-symbols-outlined text-lg">edit</span>
          Gestionar Clases
        </a>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Con Contenido', value: withContent.toString(), icon: 'topic', color: 'bg-green-50 text-green-600', sub: `de ${classes.length} clases` },
          { label: 'Unidades Totales', value: totalUnits.toString(), icon: 'library_books', color: 'bg-blue-50 text-blue-600' },
          { label: 'Temas Totales', value: totalTopics.toString(), icon: 'menu_book', color: 'bg-violet-50 text-violet-600' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${kpi.color}`}>
              <span className="material-symbols-outlined text-2xl">{kpi.icon}</span>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-500">{kpi.label}</div>
              <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
              {kpi.sub && <div className="text-xs text-gray-400">{kpi.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>
          Cargando...
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left py-3 px-5 text-gray-500 font-medium">Materia</th>
                <th className="text-left py-3 px-5 text-gray-500 font-medium">Grupo</th>
                <th className="text-left py-3 px-5 text-gray-500 font-medium">Docente</th>
                <th className="text-center py-3 px-5 text-gray-500 font-medium">Unidades</th>
                <th className="text-center py-3 px-5 text-gray-500 font-medium">Temas</th>
                <th className="text-center py-3 px-5 text-gray-500 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {classes.map(c => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                  <td className="py-3 px-5 font-medium text-gray-900">{c.subjectName}</td>
                  <td className="py-3 px-5 text-gray-600">{c.sectionName}</td>
                  <td className="py-3 px-5 text-gray-500">{c.teacherName}</td>
                  <td className="py-3 px-5 text-center font-semibold text-gray-900">{c.unitsCount}</td>
                  <td className="py-3 px-5 text-center text-gray-700">{c.topicsCount}</td>
                  <td className="py-3 px-5 text-center">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${c.hasContent ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                      {c.hasContent ? 'Con contenido' : 'Sin contenido'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
