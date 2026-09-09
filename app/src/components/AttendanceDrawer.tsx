'use client';

import { useState, useEffect, useMemo } from 'react';
import { getAttendanceSession, saveAttendanceSession } from '@/actions/attendance';
import { App } from 'antd';

type DrawerStatus = 'idle' | 'success' | 'error';
type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

type AttendanceRecord = {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
  note?: string | null;
};

const ALLOWED_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED_SCOPE: 'No tienes permisos para registrar asistencia en esta clase.',
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
  if (code && ERROR_MESSAGES[code]) return { code, text: ERROR_MESSAGES[code] };
  return { code: null, text: err instanceof Error ? err.message || fallback : fallback };
}

function sanitizeStatus(status: string | null | undefined): AttendanceStatus {
  return ALLOWED_STATUSES.includes(status as AttendanceStatus) ? (status as AttendanceStatus) : 'present';
}

export default function AttendanceDrawer({
  sectionSubjectId,
  date,
  isOpen,
  onClose,
  onSaved
}: {
  sectionSubjectId: string,
  date: string,
  isOpen: boolean,
  onClose: () => void,
  onSaved: () => void
}) {
  const { message } = App.useApp();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<DrawerStatus>('idle');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !sectionSubjectId || !date) return;

    setLoading(true);
    setDirty(false);
    setSaveStatus('idle');
    setSaveFeedback(null);

    getAttendanceSession(sectionSubjectId, date)
      .then((res) => {
        const initRecords: AttendanceRecord[] = (res.records as unknown[]).map((raw) => {
          const r = raw as { studentId: string; studentName: string; status: string | null; note: string | null };
          return {
            studentId: r.studentId,
            studentName: r.studentName,
            status: sanitizeStatus(r.status ?? undefined),
            note: r.note ?? null,
          };
        });
        setRecords(initRecords);
      })
      .catch((err) => {
        const resolved = resolveErrorMessage(err, 'Error cargando asistencia');
        setSaveStatus('error');
        setSaveFeedback(resolved.text);
        message.error(resolved.text);
      })
      .finally(() => setLoading(false));
  }, [isOpen, sectionSubjectId, date]);

  const markAll = (status: AttendanceStatus) => {
    setRecords((prev) => prev.map((r) => ({ ...r, status })));
    setDirty(true);
    setSaveStatus('idle');
    setSaveFeedback(null);
  };

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setRecords((prev) => prev.map((r) => (r.studentId === studentId ? { ...r, status } : r)));
    setDirty(true);
    setSaveStatus('idle');
    setSaveFeedback(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    setSaveFeedback(null);
    try {
      const payload = records.map((record) => ({
        studentId: record.studentId,
        status: sanitizeStatus(record.status),
        note: record.note ?? undefined,
      }));
      const res = await saveAttendanceSession(sectionSubjectId, date, payload);
      if (res.success) {
        const okText = 'Asistencia guardada correctamente.';
        setSaveStatus('success');
        setSaveFeedback(okText);
        setDirty(false);
        message.success(okText);
        onSaved();
      }
    } catch (err) {
      const resolved = resolveErrorMessage(err, 'Error al guardar asistencia');
      setSaveStatus('error');
      setSaveFeedback(resolved.text);
      message.error(resolved.text);
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    return records.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      { present: 0, absent: 0, late: 0, excused: 0 } satisfies Record<AttendanceStatus, number>
    );
  }, [records]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">

        <div className="p-6 border-b border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800">Tomar Asistencia</h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <div className="text-sm text-slate-600 mb-4">{new Date(date).toLocaleDateString()}</div>

          {saveFeedback && (
            <div className={`mb-4 rounded-lg border px-3 py-2 text-xs font-medium ${
              saveStatus === 'success'
                ? 'border-green-200 bg-green-50 text-green-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}>
              {saveFeedback}
            </div>
          )}

          <button onClick={() => markAll('present')} className="w-full py-2 bg-indigo-50 text-indigo-700 font-medium rounded-lg hover:bg-indigo-100 transition-colors">
            Marcar todos presentes
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
             <div className="text-center py-10 text-slate-500">Cargando...</div>
          ) : (
            records.map(rec => (
              <div key={rec.studentId} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-slate-50 gap-3">
                <span className="font-medium text-slate-800">{rec.studentName}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => updateStatus(rec.studentId, 'present')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${rec.status === 'present' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                  >P</button>
                  <button
                    onClick={() => updateStatus(rec.studentId, 'absent')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${rec.status === 'absent' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                  >F</button>
                  <button
                    onClick={() => updateStatus(rec.studentId, 'late')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${rec.status === 'late' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                  >R</button>
                  <button
                    onClick={() => updateStatus(rec.studentId, 'excused')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${rec.status === 'excused' ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}`}
                  >J</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 border-t border-slate-200 bg-white">
          <div className="flex justify-between items-center text-sm font-medium text-slate-600 mb-4 px-2">
            <span>P: {summary.present || 0}</span>
            <span>F: {summary.absent || 0}</span>
            <span>R: {summary.late || 0}</span>
            <span>J: {summary.excused || 0}</span>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || loading || !dirty}
            className="w-full py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {saving ? 'Guardando...' : dirty ? 'Guardar Asistencia' : 'Sin cambios'}
          </button>
        </div>

      </div>
    </div>
  );
}
