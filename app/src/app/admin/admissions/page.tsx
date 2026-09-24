'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getApplicants,
  recordExamResult,
  decideApplicant,
  convertApplicantToStudent,
  type ApplicantRow,
} from '@/actions/admissions';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  submitted: { label: 'Recibida', className: 'bg-gray-100 text-gray-700' },
  exam_passed: { label: 'Examen aprobado', className: 'bg-green-100 text-green-800' },
  exam_failed: { label: 'Examen no aprobado', className: 'bg-red-100 text-red-700' },
  accepted: { label: 'Aceptado', className: 'bg-indigo-100 text-indigo-800' },
  rejected: { label: 'Rechazado', className: 'bg-red-100 text-red-700' },
  enrolled: { label: 'Matriculado', className: 'bg-green-100 text-green-800' },
};

export default function AdmissionsPage() {
  const { message } = App.useApp();
  const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [examDrafts, setExamDrafts] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const data = await getApplicants(statusFilter || undefined);
      setApplicants(data);
    } catch (e: any) {
      message.error(e.message || 'Error al cargar aspirantes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const handleExamResult = async (id: string, passed: boolean) => {
    const score = Number(examDrafts[id] ?? 0);
    try {
      await recordExamResult(id, score, passed);
      message.success('Resultado registrado');
      load();
    } catch (e: any) {
      message.error(e.message || 'Error al registrar resultado');
    }
  };

  const handleDecide = async (id: string, decision: 'accepted' | 'rejected') => {
    try {
      await decideApplicant(id, decision);
      message.success('Decisión registrada');
      load();
    } catch (e: any) {
      message.error(e.message || 'Error al registrar decisión');
    }
  };

  const handleConvert = async (id: string) => {
    try {
      const res = await convertApplicantToStudent(id);
      if ('error' in res) {
        message.error(res.error);
      } else {
        message.success('Convertido a estudiante. Ahora puedes inscribirlo a una sección.');
        load();
      }
    } catch (e: any) {
      message.error(e.message || 'Error al convertir');
    }
  };

  return (
    <DashboardLayout
      roleTitle="Admin / Control Escolar"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Admisiones']}
    >
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Admisiones</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([key, v]) => (
            <option key={key} value={key}>{v.label}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500">Cargando...</div>
        ) : applicants.length === 0 ? (
          <div className="p-12 text-center text-gray-500">No hay aspirantes.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {applicants.map((a) => {
              const statusInfo = STATUS_LABEL[a.status] ?? { label: a.status, className: 'bg-gray-100 text-gray-700' };
              return (
                <div key={a.id} className="p-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <h3 className="font-bold text-gray-900">{a.firstName} {a.lastName}</h3>
                      <p className="text-sm text-gray-500">
                        {a.gradeLevelName ?? 'Sin grado especificado'} • {a.guardianName ?? 'Sin tutor registrado'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {a.guardianEmail} {a.guardianPhone ? `· ${a.guardianPhone}` : ''}
                      </p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusInfo.className}`}>{statusInfo.label}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    {a.status === 'submitted' && (
                      <>
                        <input
                          type="number"
                          placeholder="Puntaje examen"
                          value={examDrafts[a.id] ?? ''}
                          onChange={(e) => setExamDrafts({ ...examDrafts, [a.id]: e.target.value })}
                          className="w-32 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        />
                        <button onClick={() => handleExamResult(a.id, true)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700">
                          Aprobó examen
                        </button>
                        <button onClick={() => handleExamResult(a.id, false)} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200">
                          No aprobó
                        </button>
                      </>
                    )}
                    {a.status === 'exam_passed' && (
                      <>
                        <button onClick={() => handleDecide(a.id, 'accepted')} className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">
                          Aceptar
                        </button>
                        <button onClick={() => handleDecide(a.id, 'rejected')} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200">
                          Rechazar
                        </button>
                      </>
                    )}
                    {a.status === 'accepted' && (
                      <button onClick={() => handleConvert(a.id)} className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800">
                        Convertir a matrícula
                      </button>
                    )}
                    {a.status === 'enrolled' && (
                      <a href="/admin/enrollment" className="text-xs text-blue-600 hover:underline">
                        Ir a inscripciones para asignarle sección
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
