'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getAnnouncements, AnnouncementRow } from '@/actions/announcements';
import { message } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

export default function StudentWhatsNewPage() {
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await getAnnouncements();
        setAnnouncements(data.filter(r => r.publishedAt));
      } catch (e: any) {
        message.error(e.message || 'Error cargando novedades');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={menuGroups} breadcrumbs={['Alumno', 'Novedades']}>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Novedades</h1>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400"><span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>Cargando...</div>
      ) : announcements.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">newspaper</span>
          <p className="text-gray-500">No hay novedades por el momento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-lg">campaign</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{a.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.body}</p>
                  <div className="text-xs text-gray-400 mt-3">
                    {new Date(a.publishedAt!).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
                    {a.createdByName && <> • {a.createdByName}</>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
