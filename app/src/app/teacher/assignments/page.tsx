'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getMyAssignmentsAsTeacher,
  getSubmissionsForEvaluation,
  saveSubmissionFeedback,
  type TeacherAssignment,
  type SubmissionRow,
} from '@/actions/submissions';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['teacher']);

export default function TeacherAssignmentsPage() {
  const { message } = App.useApp();
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    getMyAssignmentsAsTeacher()
      .then(setAssignments)
      .catch((e: any) => message.error(e.message || 'Error cargando tareas'))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = async (evaluationId: string) => {
    if (expandedId === evaluationId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(evaluationId);
    setRowsLoading(true);
    try {
      const data = await getSubmissionsForEvaluation(evaluationId);
      setRows(data);
      setFeedbackDrafts(Object.fromEntries(data.map((r) => [r.studentId, r.feedback ?? ''])));
    } catch (e: any) {
      message.error(e.message || 'Error cargando entregas');
    } finally {
      setRowsLoading(false);
    }
  };

  const handleSaveFeedback = async (row: SubmissionRow) => {
    if (!row.submissionId) {
      message.error('El alumno aún no ha entregado');
      return;
    }
    try {
      await saveSubmissionFeedback(row.submissionId, feedbackDrafts[row.studentId] ?? '');
      message.success('Retroalimentación guardada');
      if (expandedId) {
        const data = await getSubmissionsForEvaluation(expandedId);
        setRows(data);
      }
    } catch (e: any) {
      message.error(e.message || 'Error al guardar');
    }
  };

  return (
    <DashboardLayout roleTitle="Docente" userName="Docente" userRole="Profesor" menuGroups={menuGroups} breadcrumbs={['Docente', 'Tareas']}>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Tareas con entrega</h1>

      {loading ? (
        <div className="py-16 text-center text-gray-400">Cargando...</div>
      ) : assignments.length === 0 ? (
        <div className="py-12 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <span className="material-symbols-outlined text-5xl text-gray-200 mb-4 block">assignment</span>
          <p className="text-gray-500">No has creado tareas con fecha límite. Agrega una fecha de entrega al crear una evaluación en el gradebook.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => (
            <div key={a.evaluationId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <button
                onClick={() => toggleExpand(a.evaluationId)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <div>
                  <h3 className="font-bold text-gray-900">{a.name}</h3>
                  <p className="text-sm text-gray-500">{a.subjectName} • {a.sectionName}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Entrega: {new Date(a.dueDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold">
                  {a.submittedCount}/{a.totalStudents} entregadas
                </span>
              </button>

              {expandedId === a.evaluationId && (
                <div className="border-t border-gray-100 p-5">
                  {rowsLoading ? (
                    <div className="py-6 text-center text-gray-400">Cargando entregas...</div>
                  ) : (
                    <div className="space-y-3">
                      {rows.map((row) => (
                        <div key={row.studentId} className="flex flex-col md:flex-row md:items-center gap-3 border-b border-gray-50 pb-3 last:border-0">
                          <div className="md:w-56 flex-shrink-0">
                            <p className="font-medium text-gray-900 text-sm">{row.studentName}</p>
                            <p className="text-xs text-gray-400">
                              {row.status === 'pending' ? 'Sin entregar' : row.status}
                              {row.fileUrl && (
                                <>
                                  {' · '}
                                  <a href={row.fileUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                                    Ver archivo
                                  </a>
                                </>
                              )}
                            </p>
                          </div>
                          <input
                            type="text"
                            value={feedbackDrafts[row.studentId] ?? ''}
                            onChange={(e) => setFeedbackDrafts({ ...feedbackDrafts, [row.studentId]: e.target.value })}
                            placeholder="Retroalimentación..."
                            disabled={!row.submissionId}
                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                          />
                          <button
                            onClick={() => handleSaveFeedback(row)}
                            disabled={!row.submissionId}
                            className="px-3 py-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors disabled:opacity-40"
                          >
                            Guardar
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
