'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['director']);

type Resource = { id: string; name: string; type: string; capacity: string; status: string; description: string };

export default function DirectorResourcesPage() {
  const { message } = App.useApp();
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        // Build resources from existing data: rooms from ClassSchedule + sections
        const { getSectionSubjects } = await import('@/actions/adminClasses');
        const sectionSubjects = await getSectionSubjects();

        const roomMap = new Map<string, { subjects: string[]; sections: Set<string> }>();
        for (const ss of sectionSubjects as any[]) {
          if (ss.schedules) {
            for (const s of ss.schedules) {
              if (s.room) {
                if (!roomMap.has(s.room)) roomMap.set(s.room, { subjects: [], sections: new Set() });
                const entry = roomMap.get(s.room)!;
                entry.subjects.push(ss.subjectName || ss.subject?.name || '');
                entry.sections.add(ss.sectionName || '');
              }
            }
          }
        }

        const resourceList = Array.from(roomMap.entries()).map(([room, data], i) => ({
          id: `room-${i}`,
          name: room,
          type: 'Aula',
          capacity: `${data.sections.size} grupo(s)`,
          status: 'Disponible',
          description: `Usada para: ${[...new Set(data.subjects)].slice(0, 3).join(', ')}${data.subjects.length > 3 ? '...' : ''}`,
        }));

        setResources(resourceList);
      } catch (e: any) {
        message.error(e.message || 'Error cargando recursos');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <DashboardLayout roleTitle="Director" userName="Director" userRole="Director" menuGroups={menuGroups} breadcrumbs={['Director', 'Gestión de Recursos']}>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Recursos</h1>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-bold">{resources.length} espacios</span>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400"><span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>Cargando...</div>
      ) : resources.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">meeting_room</span>
          <p className="text-gray-500">No hay recursos o espacios registrados.</p>
          <p className="text-sm text-gray-400 mt-1">Los espacios se registran al configurar horarios con aula asignada.</p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {[
              { label: 'Espacios', value: resources.length.toString(), icon: 'meeting_room', color: 'bg-blue-50 text-blue-600' },
              { label: 'Disponibles', value: resources.filter(r => r.status === 'Disponible').length.toString(), icon: 'check_circle', color: 'bg-green-50 text-green-600' },
              { label: 'Tipos', value: new Set(resources.map(r => r.type)).size.toString(), icon: 'category', color: 'bg-violet-50 text-violet-600' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className={`p-3 rounded-xl ${kpi.color}`}><span className="material-symbols-outlined text-2xl">{kpi.icon}</span></div>
                <div>
                  <div className="text-sm font-medium text-gray-500">{kpi.label}</div>
                  <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Resource list */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left py-3 px-5 text-gray-500 font-medium">Espacio</th>
                  <th className="text-left py-3 px-5 text-gray-500 font-medium">Tipo</th>
                  <th className="text-left py-3 px-5 text-gray-500 font-medium">Capacidad</th>
                  <th className="text-left py-3 px-5 text-gray-500 font-medium">Estado</th>
                  <th className="text-left py-3 px-5 text-gray-500 font-medium">Uso</th>
                </tr>
              </thead>
              <tbody>
                {resources.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-5 font-medium text-gray-900">{r.name}</td>
                    <td className="py-3 px-5"><span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg">{r.type}</span></td>
                    <td className="py-3 px-5 text-gray-600">{r.capacity}</td>
                    <td className="py-3 px-5"><span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg">{r.status}</span></td>
                    <td className="py-3 px-5 text-gray-500 text-xs max-w-xs truncate">{r.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
