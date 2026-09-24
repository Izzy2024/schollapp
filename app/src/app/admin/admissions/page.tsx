'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getAdmissionConfig,
  getAdmissionStats,
  getApplicants,
  recordExamResult,
  recordExamScore,
  saveAdmissionConfig,
  createApplicantByAdmin,
  decideApplicant,
  convertApplicantToStudent,
  type AdmissionExamConfig,
  type ApplicantRow,
} from '@/actions/admissions';
import { App } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  submitted: { label: 'Recibida', className: 'bg-gray-100 text-gray-700' },
  exam_passed: { label: 'Examen aprobado', className: 'bg-green-100 text-green-800' },
  exam_failed: { label: 'Examen no aprobado', className: 'bg-red-100 text-red-700' },
  accepted: { label: 'Aceptado', className: 'bg-brand-secondary text-brand-primary' },
  rejected: { label: 'Rechazado', className: 'bg-red-100 text-red-700' },
  enrolled: { label: 'Matriculado', className: 'bg-green-100 text-green-800' },
};

type ExamDraft = { id?: string; name: string; weight: number };
type AddApplicantDraft = {
  firstName: string;
  lastName: string;
  dob: string;
  gradeLevelId: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  notes: string;
};

const EMPTY_APPLICANT_DRAFT: AddApplicantDraft = {
  firstName: '', lastName: '', dob: '', gradeLevelId: '', guardianName: '', guardianEmail: '', guardianPhone: '', notes: '',
};

export default function AdmissionsPage() {
  const { message } = App.useApp();
  const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [config, setConfig] = useState<{ exams: AdmissionExamConfig[]; passPercent: number; tenantSlug: string; gradeLevels: { id: string; name: string }[] }>({ exams: [], passPercent: 70, tenantSlug: '', gradeLevels: [] });
  const [stats, setStats] = useState({ total: 0, examPassRate: 0, acceptanceRate: 0, rejectionRate: 0 });
  const [configOpen, setConfigOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState<AddApplicantDraft>(EMPTY_APPLICANT_DRAFT);
  const [examDrafts, setExamDrafts] = useState<Record<string, string>>({});
  const [configDraft, setConfigDraft] = useState<ExamDraft[]>([]);
  const [passPercentDraft, setPassPercentDraft] = useState('70');

  const load = async () => {
    setLoading(true);
    try {
      const [data, nextConfig, nextStats] = await Promise.all([
        getApplicants(statusFilter || undefined),
        getAdmissionConfig(),
        getAdmissionStats(),
      ]);
      setApplicants(data);
      setConfig(nextConfig);
      setStats(nextStats);
      if (!configOpen) {
        setConfigDraft(nextConfig.exams.map(({ id, name, weight }) => ({ id, name, weight })));
        setPassPercentDraft(String(nextConfig.passPercent));
      }
    } catch (e: any) {
      message.error(e.message || 'Error al cargar admisiones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const openConfig = () => {
    setConfigDraft(config.exams.map(({ id, name, weight }) => ({ id, name, weight })));
    setPassPercentDraft(String(config.passPercent));
    setConfigOpen(true);
  };

  const handleSaveConfig = async () => {
    try {
      await saveAdmissionConfig({ passPercent: Number(passPercentDraft), exams: configDraft });
      message.success('Configuración guardada');
      setConfigOpen(false);
      load();
    } catch (e: any) {
      message.error(e.message || 'Error al guardar configuración');
    }
  };

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

  const handleExamScore = async (applicantId: string, examId: string) => {
    const score = Number(examDrafts[`${applicantId}-${examId}`]);
    try {
      await recordExamScore(applicantId, examId, score);
      message.success('Puntaje registrado');
      load();
    } catch (e: any) {
      message.error(e.message || 'Error al registrar puntaje');
    }
  };

  const handleAddApplicant = async () => {
    try {
      const res = await createApplicantByAdmin({
        firstName: addDraft.firstName,
        lastName: addDraft.lastName,
        dob: addDraft.dob || undefined,
        gradeLevelId: addDraft.gradeLevelId || undefined,
        guardianName: addDraft.guardianName || undefined,
        guardianEmail: addDraft.guardianEmail || undefined,
        guardianPhone: addDraft.guardianPhone || undefined,
        notes: addDraft.notes || undefined,
      });
      if ('error' in res) { message.error(res.error); return; }
      message.success('Aspirante agregado');
      setAddDraft(EMPTY_APPLICANT_DRAFT);
      setAddOpen(false);
      load();
    } catch (e: any) {
      message.error(e.message || 'Error al agregar aspirante');
    }
  };

  const handleCopyLink = () => {
    const link = `${window.location.origin}/apply/${config.tenantSlug}`;
    navigator.clipboard.writeText(link);
    message.success('Enlace copiado');
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
      if ('error' in res) message.error(res.error);
      else { message.success('Convertido a estudiante. Ahora puedes inscribirlo a una sección.'); load(); }
    } catch (e: any) {
      message.error(e.message || 'Error al convertir');
    }
  };

  const weightTotal = configDraft.reduce((sum, exam) => sum + Number(exam.weight || 0), 0);

  return (
    <DashboardLayout roleTitle="Admin / Control Escolar" userName="Administrador" userRole="Administrador" menuGroups={menuGroups} breadcrumbs={['Admin', 'Admisiones']}>
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-900">Admisiones</h1>
        <div className="flex items-center gap-3">
          <button onClick={() => setAddOpen(true)} className="px-3 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:opacity-90">+ Agregar aspirante</button>
          <button onClick={openConfig} className="px-3 py-2 bg-brand-primary text-white rounded-lg text-sm font-medium hover:bg-brand-primary">Configurar exámenes</button>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary">
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_LABEL).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}
          </select>
        </div>
      </div>

      {config.tenantSlug && (
        <div className="bg-brand-secondary border border-brand-secondary rounded-xl p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-brand-primary">Enlace público de solicitud de admisión</p>
            <p className="text-xs text-brand-primary break-all">{`${typeof window !== 'undefined' ? window.location.origin : ''}/apply/${config.tenantSlug}`}</p>
          </div>
          <button onClick={handleCopyLink} className="px-3 py-1.5 bg-white border border-brand-primary text-brand-primary rounded-lg text-xs font-medium hover:bg-brand-secondary">Copiar enlace</button>
        </div>
      )}

      {addOpen && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-gray-900">Agregar aspirante</h2><button onClick={() => setAddOpen(false)} className="text-sm text-gray-500">Cerrar</button></div>
          <div className="grid grid-cols-2 gap-3">
            <input placeholder="Nombre *" value={addDraft.firstName} onChange={(e) => setAddDraft({ ...addDraft, firstName: e.target.value })} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            <input placeholder="Apellido *" value={addDraft.lastName} onChange={(e) => setAddDraft({ ...addDraft, lastName: e.target.value })} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            <input type="date" value={addDraft.dob} onChange={(e) => setAddDraft({ ...addDraft, dob: e.target.value })} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            <select value={addDraft.gradeLevelId} onChange={(e) => setAddDraft({ ...addDraft, gradeLevelId: e.target.value })} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
              <option value="">Grado al que aplica</option>
              {config.gradeLevels.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <input placeholder="Nombre del tutor" value={addDraft.guardianName} onChange={(e) => setAddDraft({ ...addDraft, guardianName: e.target.value })} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            <input placeholder="Correo del tutor" value={addDraft.guardianEmail} onChange={(e) => setAddDraft({ ...addDraft, guardianEmail: e.target.value })} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            <input placeholder="Teléfono del tutor" value={addDraft.guardianPhone} onChange={(e) => setAddDraft({ ...addDraft, guardianPhone: e.target.value })} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            <input placeholder="Notas" value={addDraft.notes} onChange={(e) => setAddDraft({ ...addDraft, notes: e.target.value })} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
          </div>
          <button onClick={handleAddApplicant} disabled={!addDraft.firstName.trim() || !addDraft.lastName.trim()} className="mt-4 px-4 py-2 bg-brand-primary text-white rounded-lg text-sm disabled:opacity-40">Guardar aspirante</button>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          ['Total de aspirantes', `${stats.total}`],
          ['Aprobó examen', `${stats.examPassRate.toFixed(1)}%`],
          ['Aceptados', `${stats.acceptanceRate.toFixed(1)}%`],
          ['Rechazados', `${stats.rejectionRate.toFixed(1)}%`],
        ].map(([label, value]) => <div key={label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4"><p className="text-xs text-gray-500">{label}</p><p className="text-2xl font-bold text-gray-900 mt-1">{value}</p></div>)}
      </div>

      {configOpen && <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-gray-900">Configurar exámenes</h2><button onClick={() => setConfigOpen(false)} className="text-sm text-gray-500">Cerrar</button></div>
        <div className="space-y-3">
          {configDraft.map((exam, index) => <div key={exam.id ?? index} className="flex gap-2 items-center">
            <input value={exam.name} onChange={(e) => setConfigDraft(configDraft.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} placeholder="Nombre del examen" className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            <input type="number" value={exam.weight} onChange={(e) => setConfigDraft(configDraft.map((item, i) => i === index ? { ...item, weight: Number(e.target.value) } : item))} className="w-24 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            <span className="text-sm text-gray-500">%</span>
            <button onClick={() => setConfigDraft(configDraft.filter((_, i) => i !== index))} className="px-2 py-2 text-red-600">Quitar</button>
          </div>)}
        </div>
        <button onClick={() => setConfigDraft([...configDraft, { name: '', weight: 0 }])} className="mt-3 text-sm text-brand-primary">+ Agregar examen</button>
        <div className="flex items-end gap-4 mt-5 flex-wrap">
          <label className="text-sm text-gray-700">Porcentaje mínimo para aprobar<input type="number" min="1" max="100" value={passPercentDraft} onChange={(e) => setPassPercentDraft(e.target.value)} className="block mt-1 w-32 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg" /></label>
          <span className={`text-sm font-medium ${weightTotal === 100 ? 'text-green-600' : 'text-red-600'}`}>Suma de pesos: {weightTotal}%</span>
          <button onClick={handleSaveConfig} disabled={weightTotal !== 100} className="px-4 py-2 bg-brand-primary text-white rounded-lg text-sm disabled:opacity-40">Guardar configuración</button>
        </div>
      </div>}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? <div className="p-12 text-center text-gray-500">Cargando...</div> : applicants.length === 0 ? <div className="p-12 text-center text-gray-500">No hay aspirantes.</div> : <div className="divide-y divide-gray-100">
          {applicants.map((a) => {
            const statusInfo = STATUS_LABEL[a.status] ?? { label: a.status, className: 'bg-gray-100 text-gray-700' };
            const configured = config.exams.length > 0;
            const canScore = configured && ['submitted', 'exam_failed'].includes(a.status);
            return <div key={a.id} className="p-5">
              <div className="flex items-start justify-between gap-4 flex-wrap"><div><h3 className="font-bold text-gray-900">{a.firstName} {a.lastName}</h3><p className="text-sm text-gray-500">{a.gradeLevelName ?? 'Sin grado especificado'} • {a.guardianName ?? 'Sin tutor registrado'}</p><p className="text-xs text-gray-400 mt-1">{a.guardianEmail} {a.guardianPhone ? `· ${a.guardianPhone}` : ''}</p></div><span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${statusInfo.className}`}>{statusInfo.label}</span></div>
              {a.weightedPercent != null && (
                <p className="text-xs text-gray-500 mt-2">
                  Resultado del examen: <span className="font-semibold text-gray-700">{a.weightedPercent.toFixed(1)}%</span>
                  {' · '}
                  {['exam_passed', 'accepted', 'enrolled'].includes(a.status) ? <span className="text-green-700 font-medium">Aprobó</span> : ['exam_failed', 'rejected'].includes(a.status) ? <span className="text-red-700 font-medium">No aprobó</span> : <span className="text-gray-500">En proceso</span>}
                  {a.examResults.length > 0 && ` · ${a.examResults.map((r) => `${r.examName}: ${r.score}`).join(', ')}`}
                </p>
              )}
              {canScore && <div className="mt-4 space-y-2">{config.exams.map((exam) => { const result = a.examResults.find((item) => item.examId === exam.id); return <div key={exam.id} className="flex items-center gap-2 flex-wrap"><span className="text-sm text-gray-700 w-44">{exam.name} ({exam.weight}%)</span><input type="number" min="0" max="100" placeholder={result ? String(result.score) : 'Puntaje'} value={examDrafts[`${a.id}-${exam.id}`] ?? ''} onChange={(e) => setExamDrafts({ ...examDrafts, [`${a.id}-${exam.id}`]: e.target.value })} className="w-28 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" /><button onClick={() => handleExamScore(a.id, exam.id)} className="px-3 py-1.5 bg-brand-primary text-white rounded-lg text-xs">Guardar</button></div>; })}<p className="text-xs text-gray-500">Promedio ponderado: {a.weightedPercent == null ? 'Sin resultados' : `${a.weightedPercent.toFixed(1)}%`} · Faltan {Math.max(config.exams.length - a.examResults.length, 0)} exámenes</p></div>}
              {!configured && a.status === 'submitted' && <div className="flex items-center gap-2 mt-4 flex-wrap"><input type="number" placeholder="Puntaje examen" value={examDrafts[a.id] ?? ''} onChange={(e) => setExamDrafts({ ...examDrafts, [a.id]: e.target.value })} className="w-32 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" /><button onClick={() => handleExamResult(a.id, true)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs">Aprobó examen</button><button onClick={() => handleExamResult(a.id, false)} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs">No aprobó</button></div>}
              <div className="flex items-center gap-2 mt-4 flex-wrap">{['exam_passed', 'exam_failed'].includes(a.status) && <><button onClick={() => handleDecide(a.id, 'accepted')} className="px-3 py-1.5 bg-brand-primary text-white rounded-lg text-xs">Aceptar</button><button onClick={() => handleDecide(a.id, 'rejected')} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs">Rechazar</button></>}{a.status === 'accepted' && <button onClick={() => handleConvert(a.id)} className="px-3 py-1.5 bg-brand-primary text-white rounded-lg text-xs">Convertir a matrícula</button>}{a.status === 'enrolled' && <a href="/admin/enrollment" className="text-xs text-brand-accent hover:underline">Ir a inscripciones para asignarle sección</a>}</div>
            </div>;
          })}
        </div>}
      </div>
    </DashboardLayout>
  );
}
