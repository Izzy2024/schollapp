'use client';

import React, { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getRecentActivities } from '@/actions/activity';
import { getActivityFilterOptions } from '@/lib/activity-taxonomy';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

type ActivityResult = Awaited<ReturnType<typeof getRecentActivities>>;

const FILTERS = getActivityFilterOptions();

export default function ActivityLogPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<ActivityResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [page, setPage] = useState(1);

  const fetchActivities = useCallback(async (filter: string, p: number) => {
    setLoading(true);
    try {
      const result = await getRecentActivities(undefined, filter, p, 50);
      setData(prev => {
        if (p === 1 || !prev) return result;
        return {
          ...result,
          activities: [...prev.activities, ...result.activities]
        };
      });
    } catch (err: any) {
      message.error(err.message || 'Error cargando bitácora');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchActivities(activeFilter, 1);
  }, [activeFilter, fetchActivities]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchActivities(activeFilter, nextPage);
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' años';
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' meses';
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' días';
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' horas';
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutos';
    return Math.floor(seconds) + ' segundos';
  };

  return (
    <DashboardLayout
      roleTitle="Admin / Control Escolar"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Bitácora de Actividad']}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bitácora Global</h1>
          <p className="text-sm text-gray-500">Registro histórico de acciones críticas dentro de la escuela</p>
        </div>
        
        <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeFilter === f.id 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className="material-symbols-outlined text-base">{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Header Stats */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex justify-between items-center text-sm">
          <span className="text-gray-500">
            Mostrando <b>{data?.activities.length || 0}</b> eventos 
            {activeFilter !== 'all' && <span> de tipo <b>{FILTERS.find((f) => f.id === activeFilter)?.label ?? activeFilter}</b></span>}
          </span>
          {loading && page === 1 && (
            <span className="text-indigo-600 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
              Cargando...
            </span>
          )}
        </div>

        {/* Timeline */}
        <div className="p-6">
          {!loading && data?.activities.length === 0 ? (
            <div className="py-20 text-center text-gray-400">
              <span className="material-symbols-outlined text-5xl mb-3 opacity-50 block">history_toggle_off</span>
              <p>No se encontraron eventos en esta categoría.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-gray-100 ml-4 space-y-8 pb-4">
              {data?.activities.map((act) => (
                <div key={act.id} className="relative pl-8">
                  <div className={`absolute -left-[21px] top-1 w-10 h-10 rounded-full border-4 border-white flex items-center justify-center shadow-sm ${act.display.iconBg} ${act.display.iconColor}`}>
                    <span className="material-symbols-outlined text-[20px]">{act.display.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-0.5">
                      {act.actorName} <span className="font-normal text-gray-600">{act.display.text}</span>
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      Hace {getTimeAgo(act.occurredAt)} • <span className="text-gray-400">{new Date(act.occurredAt).toLocaleString()}</span>
                    </div>

                    {/* Metadata Card (Ref Type/ID) */}
                    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 inline-block mt-1">
                      <p className="text-xs text-gray-500 font-mono">
                        <span className="font-semibold text-gray-700">Ref:</span> {act.entityType} #{act.entityId.slice(0,8)}...
                      </p>
                      {act.metadata && (
                        <div className="mt-2 text-xs text-gray-600">
                          {typeof act.metadata === 'object' && '_fallback' in act.metadata ? (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-1 text-amber-800">
                              <span className="material-symbols-outlined text-[14px]">warning</span>
                              Metadata no disponible ({String((act.metadata as any)._errorCode ?? 'UNKNOWN')})
                            </span>
                          ) : typeof act.metadata === 'object' ? (
                            <ul className="list-disc list-inside">
                              {Object.entries(act.metadata).map(([key, value]) => (
                                <li key={key}><span className="font-medium">{key}:</span> {String(value)}</li>
                              ))}
                            </ul>
                          ) : (
                            act.metadata
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {data && data.pagination.page < data.pagination.totalPages && (
            <div className="mt-8 text-center border-t border-gray-100 pt-6">
              <button 
                onClick={handleLoadMore}
                disabled={loading}
                className="px-6 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 hover:text-indigo-600 transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? 'Cargando más...' : 'Cargar historial anterior'}
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
