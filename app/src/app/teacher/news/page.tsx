'use client';

import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getAnnouncements, AnnouncementRow } from '@/actions/announcements';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['teacher']);

export default function TeacherNewsPage() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AnnouncementRow | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getAnnouncements();
        setRows(data.filter(r => r.publishedAt));
      } catch (e: any) {
        message.error(e.message || 'Error cargando noticias');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout
      roleTitle="Docente"
      userName="Docente"
      userRole="Docente"
      menuGroups={menuGroups}
      breadcrumbs={['Docente', 'Noticias']}
    >
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Noticias</h1>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">
          {rows.length} noticias
        </span>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400">
          <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>
          Cargando noticias...
        </div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">newspaper</span>
          <p className="text-gray-500">No hay noticias publicadas por el momento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map(row => (
            <div
              key={row.id}
              onClick={() => setSelected(row)}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 cursor-pointer hover:border-gray-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-lg">article</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-gray-900 mb-1 group-hover:text-indigo-700 transition-colors">{row.title}</h3>
                  <p className="text-sm text-gray-500 line-clamp-2 mb-2">{row.body}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>
                      {new Date(row.publishedAt!).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                    {row.createdByName && (
                      <>
                        <span>&bull;</span>
                        <span>{row.createdByName}</span>
                      </>
                    )}
                  </div>
                </div>
                <span className="material-symbols-outlined text-gray-300 group-hover:text-gray-500 transition-colors">
                  chevron_right
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <span className="px-2.5 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-lg">Noticia</span>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-3">{selected.title}</h3>
              <p className="text-gray-600 text-sm whitespace-pre-wrap leading-relaxed">{selected.body}</p>
              <div className="mt-5 pt-4 border-t border-gray-100 text-xs text-gray-400">
                Publicado {new Date(selected.publishedAt!).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                {selected.createdByName ? ` por ${selected.createdByName}` : ''}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
