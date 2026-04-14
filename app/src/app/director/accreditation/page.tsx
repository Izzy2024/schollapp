'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { message } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['director']);

type ActivityEvent = { id: string; action: string; entityType: string; entityId: string; occurredAt: string; actorName: string; display: { icon: string; iconColor: string; iconBg: string; text: string } };

export default function DirectorAccreditationPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { getRecentActivities } = await import('@/actions/activity');
        const result = await getRecentActivities(undefined, undefined, 1, 50);
        setEvents(result.activities as ActivityEvent[]);
      } catch (e: any) {
        message.error(e.message || 'Error cargando datos');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const totalEvents = events.length;
  const byType = events.reduce((acc, e) => {
    acc[e.entityType] = (acc[e.entityType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <DashboardLayout roleTitle="Director" userName="Director" userRole="Director" menuGroups={menuGroups} breadcrumbs={['Director', 'Acreditación']}>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Acreditación y Cumplimiento</h1>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400"><span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>Cargando...</div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
            {[
              { label: 'Eventos Registrados', value: totalEvents.toString(), icon: 'verified', color: 'bg-blue-50 text-blue-600' },
              { label: 'Categorías', value: Object.keys(byType).length.toString(), icon: 'category', color: 'bg-green-50 text-green-600' },
              { label: 'Estado', value: 'Activo', icon: 'check_circle', color: 'bg-emerald-50 text-emerald-600' },
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

          {/* Activity by type */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Auditoría por Categoría</h2>
            <div className="space-y-3">
              {Object.entries(byType).sort(([,a],[,b]) => b - a).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm font-medium text-gray-700 capitalize">{type === 'enrollment' ? 'Inscripciones' : type === 'announcement' ? 'Comunicados' : type === 'attendance' ? 'Asistencia' : type === 'finance' ? 'Finanzas' : type}</span>
                  <span className="text-sm font-semibold text-gray-900">{count} eventos</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent audit trail */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Registro de Auditoría Reciente</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {events.slice(0, 20).map(act => (
                <div key={act.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${act.display.iconBg} ${act.display.iconColor}`}>
                    <span className="material-symbols-outlined text-sm">{act.display.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700">{act.display.text}</span>
                    <span className="text-xs text-gray-400 ml-2">— {act.actorName}</span>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{new Date(act.occurredAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
