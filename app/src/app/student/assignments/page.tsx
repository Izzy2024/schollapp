'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { getMyAssignments, submitAssignment, type Assignment } from '@/actions/submissions';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['student']);

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  submitted: { label: 'Entregada', className: 'bg-green-100 text-green-800' },
  late: { label: 'Entregada tarde', className: 'bg-amber-100 text-amber-800' },
  graded: { label: 'Calificada', className: 'bg-indigo-100 text-indigo-800' },
};

export default function StudentAssignmentsPage() {
  const { message } = App.useApp();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getMyAssignments();
      setAssignments(data);
    } catch (e: any) {
      message.error(e.message || 'Error cargando tareas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleFileChange = async (evaluationId: string, file: File | undefined) => {
    if (!file) return;
    setSubmittingId(evaluationId);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const res = await submitAssignment(evaluationId, formData);
      if ('error' in res) {
        message.error(res.error);
      } else {
        message.success('Entrega registrada');
        await load();
      }
    } catch (e: any) {
      message.error(e.message || 'Error al entregar');
    } finally {
      setSubmittingId(null);
    }
  };

  const pending = assignments.filter((a) => !a.submission);
  const completed = assignments.filter((a) => a.submission);

  return (
    <DashboardLayout roleTitle="Alumno" userName="Alumno" userRole="Estudiante" menuGroups={menuGroups} breadcrumbs={['Alumno', 'Tareas']}>
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
        {pending.length > 0 && <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-bold">{pending.length} pendientes</span>}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          { label: 'Pendientes', value: pending.length.toString(), icon: 'pending_actions', color: 'bg-amber-50 text-amber-600' },
          { label: 'Entregadas', value: completed.length.toString(), icon: 'task_alt', color: 'bg-green-50 text-green-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${kpi.color}`}><span className="material-symbols-outlined text-xl">{kpi.icon}</span></div>
            <div><div className="text-xs font-medium text-gray-500">{kpi.label}</div><div className="text-xl font-bold text-gray-900">{kpi.value}</div></div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400"><span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>Cargando...</div>
      ) : assignments.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">assignment</span>
          <p className="text-gray-500">No hay tareas asignadas.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...pending, ...completed].map((a) => {
            const statusInfo = a.submission ? STATUS_LABEL[a.submission.status] : null;
            return (
              <div key={a.evaluationId} className={`bg-white rounded-2xl border shadow-sm p-5 ${a.submission ? 'border-gray-100' : 'border-amber-200'}`}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-lg">assignment</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">{a.name}</h3>
                      <p className="text-sm text-gray-500">{a.subjectName} • {a.teacherName}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Entrega antes de: {new Date(a.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })} • Máx: {a.maxScore} pts
                      </p>
                      {a.submission?.feedback && (
                        <p className="text-xs text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2 mt-2">
                          <strong>Retroalimentación:</strong> {a.submission.feedback}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {statusInfo && (
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusInfo.className}`}>{statusInfo.label}</span>
                    )}
                    {a.submission?.fileUrl && (
                      <a href={a.submission.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                        Ver archivo entregado
                      </a>
                    )}
                    <label className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium cursor-pointer hover:bg-gray-800 transition-colors">
                      {submittingId === a.evaluationId ? 'Subiendo...' : a.submission ? 'Reemplazar entrega' : 'Entregar archivo'}
                      <input
                        type="file"
                        className="hidden"
                        disabled={submittingId === a.evaluationId}
                        onChange={(e) => handleFileChange(a.evaluationId, e.target.files?.[0])}
                      />
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
