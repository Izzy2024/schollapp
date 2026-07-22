'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

type SubjectPrep = {
  id: string; subjectName: string; teacherName: string;
  units: { id: string; title: string; startDate: string | null; endDate: string | null; topics: { id: string; title: string; date: string | null }[] }[];
};

export default function StudentClassPrepPage() {
  const { message } = App.useApp();
  const [subjects, setSubjects] = useState<SubjectPrep[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { getStudentClassPrep } = await import('@/actions/studentQueries');
        const data = await getStudentClassPrep();
        setSubjects(data as SubjectPrep[]);
      } catch (e: any) {
        message.error(e.message || 'Error cargando planeación');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={menuGroups} breadcrumbs={['Alumno', 'Preparación de Clase']}>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Preparación de Clase</h1>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400"><span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>Cargando...</div>
      ) : subjects.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">topic</span>
          <p className="text-gray-500">No hay contenido programático disponible.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subjects.map(s => (
            <div key={s.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button onClick={() => setExpanded(expanded === s.id ? null : s.id)} className="w-full p-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">menu_book</span>
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-gray-900">{s.subjectName}</div>
                    <div className="text-sm text-gray-500">{s.teacherName} • {s.units.length} unidades</div>
                  </div>
                </div>
                <span className={`material-symbols-outlined text-gray-400 transition-transform ${expanded === s.id ? 'rotate-180' : ''}`}>expand_more</span>
              </button>

              {expanded === s.id && s.units.length > 0 && (
                <div className="border-t border-gray-100 p-5 space-y-4">
                  {s.units.map(u => (
                    <div key={u.id} className="pl-4 border-l-2 border-violet-200">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-gray-900 text-sm">{u.title}</h4>
                        {u.startDate && <span className="text-xs text-gray-400">{new Date(u.startDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>}
                      </div>
                      {u.topics.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {u.topics.map(t => (
                            <li key={t.id} className="text-sm text-gray-600 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                              {t.title}
                              {t.date && <span className="text-xs text-gray-400 ml-auto">{new Date(t.date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
