'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter, useSearchParams } from 'next/navigation';
import { getCurricularPlan, deleteUnit, reorderUnit, deleteTopic } from '@/actions/planning';
import NewTopicModal from './NewTopicModal';
import NewUnitModal from './NewUnitModal';
import { TEACHER_MENU_GROUPS } from '@/lib/teacherMenu';
import { TopicAttachments } from './TopicAttachments';

type Topic = { id: string; name: string; date: string | null; description: string | null };
type Unit = { id: string; name: string; startDate: string | null; endDate: string | null; topics: Topic[] };

export default function PlanningClient({ options, initialClassId, initialTermId, tenantSlug }: { 
  options: { classes: { id: string; name: string }[]; terms: { id: string; name: string }[] };
  initialClassId: string;
  initialTermId: string;
  tenantSlug: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [classId, setClassId] = useState(initialClassId);
  const [termId, setTermId] = useState(initialTermId);
  
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [topicModalOpen, setTopicModalOpen] = useState(false);
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const [activeUnitId, setActiveUnitId] = useState('');
  
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const urlClass = searchParams.get('class');
    const urlTerm = searchParams.get('term');

    // Avoid react-hooks/set-state-in-effect by deferring state updates.
    if (urlClass && urlClass !== classId) queueMicrotask(() => setClassId(urlClass));
    if (urlTerm && urlTerm !== termId) queueMicrotask(() => setTermId(urlTerm));
  }, [searchParams, classId, termId]);

  useEffect(() => {
    if (!classId || !termId) return;

    let cancelled = false;
    queueMicrotask(() => setLoading(true));

    getCurricularPlan(classId, termId, tenantSlug)
      .then((res) => {
        if (cancelled) return;
        setUnits(res.units);

        // Auto-expand all by default
        const exp: Record<string, boolean> = {};
        res.units.forEach((u) => (exp[u.id] = true));
        setExpandedUnits(exp);
      })
      .catch(console.error)
      .finally(() => {
        if (cancelled) return;
        queueMicrotask(() => setLoading(false));
      });

    router.replace(`/teacher/planning?class=${classId}&term=${termId}`, { scroll: false });

    return () => {
      cancelled = true;
    };
  }, [classId, termId, tenantSlug, router]);

  const toggleExpand = (id: string) => {
    setExpandedUnits(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openNewTopicModal = (unitId: string) => {
    setActiveUnitId(unitId);
    setTopicModalOpen(true);
  };

  return (
    <>
      <DashboardLayout
        roleTitle="Appsschool"
        userName="Prof. García"
        userRole="Docente Senior"
        menuGroups={TEACHER_MENU_GROUPS}
        breadcrumbs={['Docentes', 'Planificación']}
      >
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col h-full min-h-[600px] mt-[2px]">
          
          <div className="p-6 border-b border-gray-100 flex items-center gap-4 flex-wrap bg-gray-50/30">
            <h1 className="text-xl font-bold text-gray-900 mr-auto">Planificación Curricular</h1>
            
            <select 
              value={classId} 
              onChange={e => setClassId(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            >
              {options.classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select 
              value={termId} 
              onChange={e => setTermId(e.target.value)}
              className="px-4 py-2 bg-white border border-gray-200 text-sm font-medium text-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            >
              {options.terms.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>

            <button 
              onClick={() => setUnitModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">folder_open</span>
              Nueva Unidad
            </button>
          </div>

          <div className="p-8 flex-1 bg-gray-50/30">
            {loading ? (
              <div className="text-center text-gray-400 font-medium py-12">Cargando planificación...</div>
            ) : units.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-white border border-gray-100 shadow-sm rounded-full flex items-center justify-center mb-4 text-indigo-100 bg-indigo-50/50">
                  <span className="material-symbols-outlined text-3xl text-indigo-500">auto_stories</span>
                </div>
                <h3 className="text-gray-900 font-bold mb-1">Sin planificación</h3>
                <p className="text-sm text-gray-500 max-w-sm mb-6">No hay unidades creadas para este periodo. Organiza tu semestre agregando el contenido.</p>
                <button onClick={() => setUnitModalOpen(true)} className="px-5 py-2.5 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-lg">
                  Agregar Primera Unidad
                </button>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                {units.map((unit) => (
                  <div key={unit.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 bg-gray-50/80 flex items-center justify-between transition-colors">
                      <div className="flex items-center gap-4 cursor-pointer" onClick={() => toggleExpand(unit.id)}>
                        <span className={`material-symbols-outlined text-gray-400 transition-transform duration-300 ${expandedUnits[unit.id] ? 'rotate-90' : ''}`}>
                          chevron_right
                        </span>
                        <div>
                          <h3 className="text-[15px] font-bold text-gray-900">{unit.name}</h3>
                          <p className="text-xs text-gray-500 font-medium mt-0.5">
                            {unit.startDate ? new Date(unit.startDate).toLocaleDateString('es-ES', { month: 'short', day: 'numeric'}) : 'Falta fecha'} - {unit.endDate ? new Date(unit.endDate).toLocaleDateString('es-ES', { month: 'short', day: 'numeric'}) : 'Falta fecha'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md">
                          {unit.topics.length} temas
                        </span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => {
                            reorderUnit(unit.id, 'up', tenantSlug).then(() => window.location.reload());
                          }} className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 text-gray-400">
                            <span className="material-symbols-outlined text-[18px]">arrow_upward</span>
                          </button>
                          <button onClick={() => {
                            reorderUnit(unit.id, 'down', tenantSlug).then(() => window.location.reload());
                          }} className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 text-gray-400">
                            <span className="material-symbols-outlined text-[18px]">arrow_downward</span>
                          </button>
                          <button onClick={async () => {
                            if (confirm('¿Eliminar unidad?')) {
                              await deleteUnit(unit.id, tenantSlug);
                              window.location.reload();
                            }
                          }} className="w-8 h-8 rounded-full border border-red-200 bg-red-50 flex items-center justify-center hover:bg-red-100 text-red-600 ml-2">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {expandedUnits[unit.id] && (
                      <div className="p-6 border-t border-gray-100">
                        <div className="space-y-3 mb-4">
                          {unit.topics.map((topic, index) => (
                            <div key={topic.id} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/10 transition-colors group">
                              <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <h4 className="text-[14px] font-bold text-gray-900 mb-1">{topic.name}</h4>
                                {topic.description && <p className="text-[13px] text-gray-500 mb-2 leading-relaxed">{topic.description}</p>}
                                <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium bg-indigo-50 w-fit px-2 py-1 rounded-md">
                                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                  {topic.date ? new Date(topic.date).toLocaleDateString('es-ES', { weekday: 'long', month: 'short', day: 'numeric' }) : 'Falta fecha'}
                                </div>
                                <TopicAttachments topicId={topic.id} />
                              </div>
                              <button onClick={async () => {
                                if (confirm('¿Eliminar tema?')) {
                                  await deleteTopic(topic.id, tenantSlug);
                                  window.location.reload();
                                }
                              }} className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 transition-all p-1 mr-2">
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            </div>
                          ))}
                        </div>
                        
                        <button 
                          onClick={(e) => { e.stopPropagation(); openNewTopicModal(unit.id); }}
                          className="w-full py-3 border-2 border-dashed border-gray-200 text-gray-500 text-sm font-semibold rounded-xl hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-lg">add_circle</span>
                          Agregar Tema
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DashboardLayout>

      <NewTopicModal 
        isOpen={topicModalOpen} 
        onClose={() => {
          setTopicModalOpen(false);
          window.location.reload();
        }}
        unitId={activeUnitId}
        tenantSlug={tenantSlug}
      />
      <NewUnitModal
        isOpen={unitModalOpen}
        onClose={() => {
          setUnitModalOpen(false);
          window.location.reload();
        }}
        sectionSubjectId={classId}
        termId={termId}
        tenantSlug={tenantSlug}
      />
    </>
  );
}
