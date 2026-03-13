'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useRouter, useSearchParams } from 'next/navigation';
import { getGradebookData, saveGradeRecord } from '@/actions/gradebook';
import NewEvaluationModal from './NewEvaluationModal';
import { TEACHER_MENU_GROUPS } from '@/lib/teacherMenu';

type Evaluation = { id: string; name: string; type: string; date: string; };
type StudentGrade = { id: string; name: string; grades: { evaluationId: string; score: number | null }[] };

export default function GradebookClient({ options, initialClassId, initialTermId, tenantSlug }: { 
  options: { classes: { id: string; name: string }[]; terms: { id: string; name: string }[] };
  initialClassId: string;
  initialTermId: string;
  tenantSlug: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [classId, setClassId] = useState(initialClassId);
  const [termId, setTermId] = useState(initialTermId);
  
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Local overrides for optimistic UI
  const [localGrades, setLocalGrades] = useState<Record<string, number | null>>({});

  useEffect(() => {
    // If URL params exist but our state diverges, update state.
    const urlClass = searchParams.get('class');
    const urlTerm = searchParams.get('term');
    if (urlClass && urlClass !== classId) setClassId(urlClass);
    if (urlTerm && urlTerm !== termId) setTermId(urlTerm);
  }, [searchParams, classId, termId]);

  useEffect(() => {
    if (!classId || !termId) return;

    setLoading(true);
    getGradebookData(classId, termId, tenantSlug)
      .then(res => {
        setEvaluations(res.evaluations);
        setStudents(res.students);
        
        // build local grades map
        const map: Record<string, number | null> = {};
        res.students.forEach(st => {
          st.grades.forEach(g => {
            map[`${st.id}-${g.evaluationId}`] = g.score;
          });
        });
        setLocalGrades(map);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
      
      // Update URL silently
      router.replace(`/teacher/gradebook?class=${classId}&term=${termId}`, { scroll: false });
  }, [classId, termId, tenantSlug, router]);

  const handleGradeChange = (studentId: string, evaluationId: string, value: string) => {
    const key = `${studentId}-${evaluationId}`;
    const score = value === '' ? null : Number(value);
    setLocalGrades(prev => ({ ...prev, [key]: score }));
  };

  const handleGradeBlur = async (studentId: string, evaluationId: string) => {
    const key = `${studentId}-${evaluationId}`;
    const score = localGrades[key];
    
    // Check if changed compared to prop
    const student = students.find(s => s.id === studentId);
    const original = student?.grades.find(g => g.evaluationId === evaluationId)?.score;

    if (score === original || (score === null && original == null)) {
      return; // no change
    }

    if (score !== null) {
      try {
        await saveGradeRecord(evaluationId, studentId, score, tenantSlug);
        showToast('✓ Guardado');
      } catch (e) {
        showToast('Error al guardar', true);
        // revert logic could go here
      }
    }
  };

  const showToast = (msg: string, isError = false) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2000);
  };

  const getStudentAverage = (studentId: string) => {
    const evIds = evaluations.map(e => e.id);
    let sum = 0;
    let count = 0;
    evIds.forEach(eid => {
      const val = localGrades[`${studentId}-${eid}`];
      if (val !== null && val !== undefined) {
        sum += val;
        count++;
      }
    });
    return count === 0 ? null : Math.round(sum / count);
  };

  const getEvaluationAverage = (evaluationId: string) => {
    let sum = 0;
    let count = 0;
    students.forEach(st => {
      const val = localGrades[`${st.id}-${evaluationId}`];
      if (val !== null && val !== undefined) {
        sum += val;
        count++;
      }
    });
    return count === 0 ? null : Math.round(sum / count);
  };

  return (
    <>
      <DashboardLayout
        roleTitle="Appsschool"
        userName="Prof. García"
        userRole="Docente Senior"
        menuGroups={TEACHER_MENU_GROUPS}
        breadcrumbs={['Docentes', 'Libro de Calificaciones']}
      >
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col h-full min-h-[600px] mt-[2px] relative">
          
          {toastMessage && (
            <div className="absolute top-6 right-8 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-md shadow-lg z-10 animate-in fade-in slide-in-from-top-2">
              {toastMessage}
            </div>
          )}

          <div className="p-6 border-b border-gray-100 flex items-center gap-4 flex-wrap bg-gray-50/30">
            <h1 className="text-xl font-bold text-gray-900 mr-auto">Libro de Calificaciones</h1>
            
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
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Nueva Evaluación
            </button>
          </div>

          <div className="p-0 overflow-x-auto flex-1">
            {loading ? (
              <div className="p-12 text-center text-gray-400 font-medium">Cargando calificaciones...</div>
            ) : evaluations.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-3xl text-gray-300">fact_check</span>
                </div>
                <h3 className="text-gray-900 font-bold mb-1">Sin evaluaciones</h3>
                <p className="text-sm text-gray-500 max-w-sm mb-6">No hay evaluaciones creadas en este periodo. Comienza agregando una nueva.</p>
                <button onClick={() => setModalOpen(true)} className="px-5 py-2 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-xl hover:bg-indigo-100 transition-colors">
                  Crear Evaluación
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 tracking-wider border-b border-gray-200 sticky left-0 bg-gray-50 z-10 w-64 shadow-[1px_0_0_0_#f3f4f6]">Alumno</th>
                    {evaluations.map(ev => (
                      <th key={ev.id} className="px-3 py-3 text-center border-b border-gray-200 min-w-[120px]">
                        <div className="flex flex-col items-center">
                          <span className="text-[13px] font-bold text-gray-900 mb-0.5 whitespace-nowrap">{ev.name}</span>
                          <span className="text-[10px] text-gray-500 font-medium">{ev.type} • {new Date(ev.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </th>
                    ))}
                    <th className="px-6 py-4 text-center text-[12px] font-bold text-indigo-700 bg-indigo-50/50 border-b border-gray-200 uppercase tracking-wider">Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st) => {
                    const avg = getStudentAverage(st.id);
                    const isLow = avg !== null && avg < 60;
                    return (
                      <tr key={st.id} className={`group ${isLow ? 'bg-red-50/30' : 'hover:bg-gray-50/50'} transition-colors`}>
                        <td className={`px-6 py-3 text-[14px] font-semibold sticky left-0 z-10 shadow-[1px_0_0_0_#f3f4f6] truncate ${isLow ? 'text-red-700 bg-[#fffbfc]' : 'text-gray-900 bg-white group-hover:bg-gray-50/50'}`}>
                          {st.name}
                        </td>
                        {evaluations.map(ev => (
                          <td key={ev.id} className="px-3 py-2 text-center border-b border-gray-50">
                            <input 
                              type="number"
                              value={localGrades[`${st.id}-${ev.id}`] === null ? '' : localGrades[`${st.id}-${ev.id}`]!}
                              onChange={(e) => handleGradeChange(st.id, ev.id, e.target.value)}
                              onBlur={() => handleGradeBlur(st.id, ev.id)}
                              placeholder="—"
                              className="w-14 text-center border border-transparent rounded-lg py-1.5 text-[14px] font-medium text-gray-900 bg-transparent hover:border-gray-200 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-gray-300"
                              min="0"
                              max="100"
                            />
                          </td>
                        ))}
                        <td className={`px-6 py-3 text-center font-bold text-[14px] border-b border-gray-50 ${isLow ? 'text-red-600 bg-red-50/50' : 'text-indigo-700 bg-indigo-50/30'}`}>
                          {avg !== null ? avg : '—'}
                          {isLow && <span className="ml-1.5 text-red-500 text-[11px] font-black">⚠</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50">
                    <td className="px-6 py-4 text-[13px] font-bold text-gray-600 sticky left-0 z-10 bg-gray-50 shadow-[1px_0_0_0_#f3f4f6] border-t-2 border-gray-200">Promedio del Grupo</td>
                    {evaluations.map(ev => {
                      const grpAvg = getEvaluationAverage(ev.id);
                      return (
                        <td key={ev.id} className="px-3 py-4 text-center font-bold text-gray-700 text-[14px] border-t-2 border-gray-200">
                          {grpAvg !== null ? grpAvg : '—'}
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 text-center font-bold text-indigo-800 text-[15px] bg-indigo-50/80 border-t-2 border-indigo-100">
                      {Math.round(evaluations.reduce((sum, ev) => sum + (getEvaluationAverage(ev.id) || 0), 0) / (evaluations.length || 1)) || '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
          
          <div className="px-6 py-3 bg-white border-t border-gray-100 flex items-center justify-between text-[11px] font-medium text-gray-400 uppercase tracking-wider">
            <span>💾 Autoguardado al cambiar de celda</span>
            <span>Unidades: 0–100</span>
          </div>
        </div>
      </DashboardLayout>

      <NewEvaluationModal 
        isOpen={modalOpen} 
        onClose={async () => {
          setModalOpen(false);
          // Optional: re-fetch local data here if next router.replace isn't triggering full refresh immediately
          // but Server Actions + revalidatePath usually covers it. For now, window reload works perfectly in dev.
          window.location.reload();
        }}
        sectionSubjectId={classId}
        termId={termId}
        tenantSlug={tenantSlug}
      />
    </>
  );
}
