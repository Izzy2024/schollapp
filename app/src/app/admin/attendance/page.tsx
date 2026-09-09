'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  getSectionsForAttendance,
  getAttendanceBySectionDate,
  saveAttendanceBySectionDate,
} from '@/actions/attendance';
import { App, Modal } from 'antd';
import { getMenuGroupsForRoles } from '@/lib/nav/menu';

const menuGroups = getMenuGroupsForRoles(['admin']);

type Section = { id: string; name: string; gradeLevelId: string; gradeLevelName: string; enrolledCount: number };
type AttRec = { studentId: string; studentName: string; studentCode: string | null; status: string | null; note: string | null };
type TakenBy = { name: string; role: string | null } | null;

const STATUS_CONFIG = {
  present:  { label: 'Presente',  short: 'P', color: 'bg-green-100 text-green-700 border-green-200',  active: 'bg-green-500 text-white border-green-500' },
  absent:   { label: 'Falta',     short: 'F', color: 'bg-red-50   text-red-600   border-red-200',    active: 'bg-red-500   text-white border-red-500'   },
  late:     { label: 'Retardo',   short: 'R', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', active: 'bg-yellow-400 text-white border-yellow-400' },
  excused:  { label: 'Justific.', short: 'J', color: 'bg-blue-50   text-blue-600  border-blue-200',   active: 'bg-blue-500  text-white border-blue-500'  },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

type SaveStatus = 'idle' | 'success' | 'error';

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED_SCOPE: 'No tienes permisos para registrar asistencia en este grupo.',
  TENANT_SCOPE_VIOLATION: 'No tienes permisos para operar asistencia fuera de tu institución.',
  INVALID_ATTENDANCE_STATUS: 'Se detectó un estado de asistencia inválido. Revisa y vuelve a intentar.',
  INVALID_ATTENDANCE_DATE: 'La fecha de asistencia no es válida.',
  SECTION_NOT_FOUND: 'La sección seleccionada ya no existe o no está disponible.',
};

function parseErrorCode(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err ?? '');
  const stableCode = msg.match(/\b(UNAUTHORIZED_SCOPE|TENANT_SCOPE_VIOLATION|INVALID_ATTENDANCE_STATUS|INVALID_ATTENDANCE_DATE|SECTION_NOT_FOUND)\b/);
  return stableCode?.[1] ?? null;
}

function resolveErrorMessage(err: unknown, fallback: string) {
  const code = parseErrorCode(err);
  if (code && ERROR_MESSAGES[code]) {
    return { code, text: ERROR_MESSAGES[code] };
  }
  const raw = err instanceof Error ? err.message : '';
  return { code: null, text: raw || fallback };
}

// Produce today's date in local timezone as YYYY-MM-DD
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function AttendancePage() {
  const { message } = App.useApp();
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [date, setDate] = useState(todayIso());
  const [records, setRecords] = useState<AttRec[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [takenBy, setTakenBy] = useState<TakenBy>(null);
  const [editUnlocked, setEditUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // Load sections once
  useEffect(() => {
    getSectionsForAttendance()
      .then((data) => {
        setSections(data);
        if (data.length > 0) setSelectedSectionId(data[0].id);
      })
      .catch((e) => {
        const resolved = resolveErrorMessage(e, 'Error cargando secciones de asistencia');
        setSaveStatus('error');
        setSaveFeedback(resolved.text);
        message.error(resolved.text);
      });
  }, []);

  // Load records when section or date changes
  const loadRecords = useCallback(async () => {
    if (!selectedSectionId || !date) return;
    setLoading(true);
    setDirty(false);
    try {
      const data = await getAttendanceBySectionDate(selectedSectionId, date);
      setSessionId(data.sessionId);
      setTakenBy(data.takenBy);
      setEditUnlocked(false);
      setRecords(data.records.map(r => ({ ...r, status: r.status ?? 'present' })));
      setSaveStatus('idle');
      setSaveFeedback(null);
    } catch (e: unknown) {
      const resolved = resolveErrorMessage(e, 'Error cargando asistencia');
      setSaveStatus('error');
      setSaveFeedback(resolved.text);
      message.error(resolved.text);
    } finally {
      setLoading(false);
    }
  }, [selectedSectionId, date]);

  useEffect(() => { loadRecords(); }, [loadRecords]);

  const updateStatus = (studentId: string, status: StatusKey) => {
    setRecords(prev => prev.map(r => r.studentId === studentId ? { ...r, status } : r));
    setDirty(true);
    setSaveStatus('idle');
    setSaveFeedback(null);
  };

  const markAll = (status: StatusKey) => {
    setRecords(prev => prev.map(r => ({ ...r, status })));
    setDirty(true);
    setSaveStatus('idle');
    setSaveFeedback(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    setSaveFeedback(null);
    try {
      await saveAttendanceBySectionDate(
        selectedSectionId,
        date,
        records.map(r => ({ studentId: r.studentId, status: r.status ?? 'present' }))
      );
      const successText = 'Asistencia guardada correctamente.';
      setSaveStatus('success');
      setSaveFeedback(successText);
      message.success('¡Asistencia guardada exitosamente!');
      setDirty(false);
      await loadRecords();
    } catch (e: unknown) {
      const resolved = resolveErrorMessage(e, 'Error al guardar asistencia');
      setSaveStatus('error');
      setSaveFeedback(resolved.text);
      message.error(resolved.text);
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, late: 0, excused: 0 };
    for (const r of records) {
      const k = r.status as StatusKey;
      if (k in counts) counts[k]++;
    }
    return counts;
  }, [records]);

  const requestUnlockEdit = () => {
    Modal.confirm({
      title: 'Habilitar edición de asistencia',
      content: takenBy
        ? `Esta asistencia fue registrada por ${takenBy.name}${takenBy.role ? ` (${takenBy.role})` : ''}. Estás por modificarla como administrador. Este cambio queda registrado en el historial de actividad.`
        : 'Estás por registrar asistencia como administrador. Esta acción queda registrada en el historial de actividad.',
      okText: 'Habilitar edición',
      cancelText: 'Cancelar',
      onOk: () => setEditUnlocked(true),
    });
  };

  const selectedSection = sections.find(s => s.id === selectedSectionId);

  const sectionsByGrade = useMemo(() => {
    const map = new Map<string, Section[]>();
    for (const s of sections) {
      const arr = map.get(s.gradeLevelName) ?? [];
      arr.push(s);
      map.set(s.gradeLevelName, arr);
    }
    return map;
  }, [sections]);

  const totalPct = records.length > 0
    ? Math.round(((summary.present + summary.late) / records.length) * 100)
    : 0;

  return (
    <DashboardLayout
      roleTitle="Admin / Control Escolar"
      userName="Administrador"
      userRole="Administrador"
      menuGroups={menuGroups}
      breadcrumbs={['Admin', 'Asistencia']}
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Control de Asistencia</h1>
          <p className="text-sm text-gray-500 mt-1">Pase de lista por grupo</p>
        </div>
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-700/20 disabled:opacity-60 animate-pulse"
          >
            {saving ? (
              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
            ) : (
              <span className="material-symbols-outlined text-sm">save</span>
            )}
            {saving ? 'Guardando...' : 'Guardar Asistencia'}
          </button>
        )}
      </div>

      {!loading && selectedSectionId && (
        <div className={`mb-4 flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${
          editUnlocked ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-gray-200 bg-gray-50 text-gray-600'
        }`}>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base">{editUnlocked ? 'edit' : 'visibility'}</span>
            <span>
              {editUnlocked
                ? 'Modo edición habilitado — los cambios que hagas quedan registrados como acción de administrador.'
                : takenBy
                  ? `Vista de solo lectura. Registrado por ${takenBy.name}${takenBy.role ? ` (${takenBy.role})` : ''}.`
                  : 'Vista de solo lectura. Aún no se ha registrado asistencia para esta fecha.'}
            </span>
          </div>
          {!editUnlocked && (
            <button
              onClick={requestUnlockEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">lock_open</span>
              Habilitar edición
            </button>
          )}
        </div>
      )}

      {saveFeedback && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${
          saveStatus === 'success'
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {saveFeedback}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Fecha del pase de lista
            </label>
            <input
              type="date"
              value={date}
              max={todayIso()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900"
            />
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Grupo / Sección</span>
            </div>
            <div className="overflow-y-auto max-h-[480px]">
              {Array.from(sectionsByGrade.entries()).map(([grade, secs]) => (
                <div key={grade}>
                  <div className="px-4 py-2 text-xs text-gray-400 font-bold uppercase tracking-wider bg-gray-50/30 border-b border-gray-100">
                    {grade}
                  </div>
                  {secs.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedSectionId(s.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors border-b border-gray-50 last:border-0 ${
                        selectedSectionId === s.id
                          ? 'bg-gray-900 text-white'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-base opacity-70">groups</span>
                        <span className="font-medium">Sección &quot;{s.name}&quot;</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        selectedSectionId === s.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {s.enrolledCount}
                      </span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {selectedSection && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">
                    {selectedSection.gradeLevelName} — Sección &quot;{selectedSection.name}&quot;
                  </h2>
                  <p className="text-sm text-gray-400 mt-0.5">
                    {new Date(date + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                    {sessionId && (
                      <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded uppercase">
                        Guardado
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-gray-900">{totalPct}%</div>
                  <div className="text-xs text-gray-400">Asistencia</div>
                </div>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden flex">
                {records.length > 0 && (
                  <>
                    <div className="h-full bg-green-500 transition-all" style={{ width: `${(summary.present / records.length) * 100}%` }} />
                    <div className="h-full bg-yellow-400 transition-all" style={{ width: `${(summary.late    / records.length) * 100}%` }} />
                    <div className="h-full bg-blue-400  transition-all" style={{ width: `${(summary.excused  / records.length) * 100}%` }} />
                    <div className="h-full bg-red-400   transition-all" style={{ width: `${(summary.absent   / records.length) * 100}%` }} />
                  </>
                )}
              </div>
              <div className="flex justify-between mt-3 text-xs text-gray-500 font-medium">
                <span className="text-green-600">P: {summary.present}</span>
                <span className="text-yellow-600">R: {summary.late}</span>
                <span className="text-blue-600">J: {summary.excused}</span>
                <span className="text-red-600">F: {summary.absent}</span>
                <span className="text-gray-400">Total: {records.length}</span>
              </div>
            </div>
          )}

          {records.length > 0 && editUnlocked && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-3 flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-gray-600">Marcar todos:</span>
              {(Object.keys(STATUS_CONFIG) as StatusKey[]).map(s => (
                <button
                  key={s}
                  onClick={() => markAll(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-colors ${STATUS_CONFIG[s].color} hover:opacity-80`}
                >
                  {STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="py-16 text-center text-gray-400">
                <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3 animate-spin">progress_activity</span>
                Cargando alumnos...
              </div>
            ) : records.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <span className="material-symbols-outlined text-4xl text-gray-200 block mb-3">person_off</span>
                No hay alumnos inscritos en esta sección.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {records.map((rec, idx) => (
                  <div
                    key={rec.studentId}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-center text-xs text-gray-300 font-bold">{idx + 1}</span>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        rec.status === 'present' ? 'bg-green-100 text-green-700' :
                        rec.status === 'absent'  ? 'bg-red-100   text-red-600'   :
                        rec.status === 'late'    ? 'bg-yellow-100 text-yellow-700' :
                        rec.status === 'excused' ? 'bg-blue-100  text-blue-600'  :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {rec.studentName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm">{rec.studentName}</div>
                        {rec.studentCode && (
                          <div className="text-xs text-gray-400 font-mono">{rec.studentCode}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      {(Object.entries(STATUS_CONFIG) as [StatusKey, typeof STATUS_CONFIG[StatusKey]][]).map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => editUnlocked && updateStatus(rec.studentId, key)}
                          disabled={!editUnlocked}
                          title={cfg.label}
                          className={`w-9 h-9 rounded-xl text-sm font-bold border-2 transition-all ${
                            rec.status === key ? cfg.active : 'bg-white border-gray-200 text-gray-400 hover:border-gray-400'
                          } ${!editUnlocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {cfg.short}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {records.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving || !dirty}
                className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${
                  dirty
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-700/20'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-sm">save</span>
                )}
                {saving ? 'Guardando...' : dirty ? 'Guardar Asistencia' : 'Sin cambios'}
              </button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
